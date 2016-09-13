import {Component} from 'angular2/core';

@Component({
    selector: 'status',
    template: require('./status.html'),
    styles: [require('./status.scss')]
})
export class StatusBar {
    /*constructor() {
        var aqsFilter = SerialDevice.GetDeviceSelector("COM3");
        var devices = await DeviceInformation.FindAllAsync(aqsFilter);
        if (devices.Any()) {
            var deviceId = devices.First().Id;
            this.device = await SerialDevice.FromIdAsync(deviceId);

            if (this.device != null) {
                this.device.BaudRate = 57600;
                this.device.StopBits = SerialStopBitCount.One;
                this.device.DataBits = 8;
                this.device.Parity = SerialParity.None;
                this.device.Handshake = SerialHandshake.None;

                this.reader = new DataReader(this.device.InputStream);
            }
        }
    }*/
}

