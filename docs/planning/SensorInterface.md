##Current plan for sensor interface
- Sensor data is currently sent to html and visualizer from datastream.js
- A file will be created called sensorData.js which will be imported in the client/games/"game" files
- sensorData.js will be have its value set in datastream.js to have the sensors data
- Whenever input is handled in client/games/"game" the sensorData.js will have its data gotten and bundled into the input before the input is sent