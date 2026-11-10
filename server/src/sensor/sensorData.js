let sensorVal = 0;
let peakVal = 0; // tries to approximate peak of wave until next wave starts increasing
let sensitivity = 0.00001;
let increasingFlag = false;
let decreasingFlag = false;
let waveIntegral = 0;
let waveSum = 0;
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
    if (d > sensorVal)
    {
        if (decreasingFlag)
        {
            waveIntegral = waveSum;
            waveSum = 0;
        }
        increasingFlag = true;
        decreasingFlag = false;
    }
    else
    {
        if (increasingFlag)
        {
            peakVal = d;
        }
        decreasingFlag = true;
        increasingFlag = false;
    }
    waveSum += d;
    sensorVal = d;
}

export function getPeak()
{
    return peakVal;
}

export function getWaveIntegral()
{
    return waveIntegral;
}