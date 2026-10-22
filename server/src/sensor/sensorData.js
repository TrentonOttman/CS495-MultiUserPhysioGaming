let sensorVal = 0;
let peakVal = 0; // tries to approximate peak of wave until next wave starts increasing

export function getData()
{
    return sensorVal;
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