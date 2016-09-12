import {Component} from 'angular2/core';
import {bootstrap} from 'angular2/platform/browser';


@Component({
    selector: 'status',
    template: '<p>This is status</p>',
    styles: [require('./status.scss')],
})
export class Status {}
