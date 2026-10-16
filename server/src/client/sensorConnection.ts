import * as datastreams from "../sensor/index.esm.js";
import ganglion from "../sensor/ganglion.esm.js";
import { setData } from "../sensor/sensorData.js";

export type SensorStatus = "Disconnected" | "Connecting" | "Connected" | "Error";
type Listener = (status: SensorStatus, message?: string) => void;

// One browser-owned connection survives lobby/game view changes for the life
// of this page. The browser will require a new user gesture after a full reload.
const devices = new datastreams.DataDevices();
devices.load(ganglion);
let device: any = null;
let status: SensorStatus = "Disconnected";
let errorMessage = "";
let connecting = false;
const listeners = new Set<Listener>();
const samples: number[] = [];
const MAX_SAMPLES = 240;

function publish(next: SensorStatus, message = "") {
    status = next;
    errorMessage = message;
    listeners.forEach((listener) => listener(status, errorMessage));
}

export function getSensorStatus() { return status; }
export function getSensorSamples() { return samples; }
export function subscribeSensor(listener: Listener) {
    listeners.add(listener);
    listener(status, errorMessage);
    return () => listeners.delete(listener);
}

export async function connectSensor() {
    if (connecting || status === "Connected") return;
    connecting = true;
    publish("Connecting");
    try {
        device = await devices.getUserDevice({ label: "ganglion" });
        if (!device) throw new Error("No supported sensor connection was created.");
        const stream = device.stream;
        const onTrack = (track: any) => {
            track.subscribe((data: number | number[]) => {
                const raw = Array.isArray(data) ? data[0] : data;
                const sample = Math.abs(Number(raw) * 10000);
                if (Number.isFinite(sample)) {
                    samples.push(sample);
                    setData(sample / 10000);
                    if (samples.length > MAX_SAMPLES) samples.shift();
                }
            });
        };
        stream.tracks.forEach(onTrack);
        stream.onaddtrack = (event: any) => onTrack(event.track);
        const connectionStatus = device.device?.connectionStatus;
        connectionStatus?.subscribe?.((connected: boolean) => {
            if (!connected && status === "Connected") publish("Disconnected", "Sensor disconnected. Reconnect when ready.");
        });
        publish("Connected");
    } catch (error) {
        device = null;
        const message = error instanceof Error ? error.message : "Could not connect to the sensor.";
        publish("Error", message);
    } finally {
        connecting = false;
    }
}

export function disconnectSensor() {
    if (!device) return;
    try { device.device?.disconnect?.(); } catch (error) { console.warn("Sensor disconnect failed", error); }
    device = null;
    publish("Disconnected");
}
