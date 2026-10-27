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
    if (d > sensorVal)
    {
        peakVal = d;
    }
    sensorVal = d;
}

export function getPeak()
{
    return peakVal;
}