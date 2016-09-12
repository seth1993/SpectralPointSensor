import {Component, OnInit} from 'angular2/core';

@Component({
  selector: 'about',
  template: require('./debugwindow.html'),
  styles: [require('./debugwindow.scss')],
  providers: [],
  directives: [],
  pipes: []
})
export class DebugWindow implements OnInit {

  constructor() {
    // Do stuff
  }

  ngOnInit() {
    console.log('Hello About');
  }

}
