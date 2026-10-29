let sensorVal = 0;
let peakVal = 0; // tries to approximate peak of wave until next wave starts increasing
let sensitivity = 0.00001;
export function getData()
{
    return sensorVal;
}

export function setSensitivity(s)
{
    sensitivity = s;
}

export function getSensitivity()
{
    return sensitivity;
}

export function setData(d)
{
    // Treat every incoming sensor sample as a full-strength jump signal.
    // The client uses getPeak() > getSensitivity() to turn that signal into
    // the game's jump button.
    sensorVal = d === 0 ? 0 : 1;
    peakVal = sensorVal;
}

export function getPeak()
{
    return peakVal;
}
