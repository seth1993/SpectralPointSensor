# angular2-universal-windows-app

[![Dependency Status](https://david-dm.org/preboot/angular2-universal-windows-app/status.svg)](https://david-dm.org/preboot/angular2-universal-windows-app#info=dependencies) [![devDependency Status](https://david-dm.org/preboot/angular2-universal-windows-app/dev-status.svg)](https://david-dm.org/preboot/angular2-universal-windows-app#info=devDependencies)

An Universal Windows App (uwp) powered by Angular 2 ! 

This seed repo serves as an Angular 2 starter for anyone looking to get up and running with Angular 2 in an Universal Windows app fast. Using [Webpack](http://webpack.github.io/) for building our files.
* Best practices in file and application organization for [Angular 2](https://angular.io/).
* Ready to go build system using [Webpack](https://webpack.github.io/docs/) for working with [TypeScript](http://www.typescriptlang.org/).
* Stylesheets with [SASS](http://sass-lang.com/) (not required, it supports regular css too).
* Error reported with [TSLint](http://palantir.github.io/tslint/).

>Warning: Make sure you're using the latest version of Node.js and NPM

[Is Angular 2 Ready Yet?](http://splintercode.github.io/is-angular-2-ready/)

### Quick start

> Clone/Download the repo then edit `app.ts` inside [`/src/app/app.ts`](/src/app/app.ts)

```bash
# clone our repo
$ git clone https://github.com/preboot/angular2-universal-windows-app.git my-app

# change directory to your app
$ cd my-app

# install the dependencies with npm
$ npm install

# start the build watch
$ npm start
```

# install [Visual Studio community edition](https://www.visualstudio.com/en-us/downloads/download-visual-studio-vs)
First download and do a custom install of Microsoft Visual Studio.
Make sure that the Universal Windows App Development Tools are selected from the optional features list.
Without these tools, you won't be able to create your Windows 10 universal apps.

![Visual Studio parameters](https://i-msdn.sec.s-msft.com/dynimg/IC819919.png)

# Table of Contents

* [Getting Started](#getting-started)
    * [Dependencies](#dependencies)
    * [Installing](#installing)
    * [Running the app](#running-the-app)
    * [Developing](#developing)
    * [Add new components with Angular 2 cli](#add-new-components-services-pipes-with-angular-2-cli)
    * [Testing](#testing)
    * [Documentation](#documentation)
* [Frequently asked questions](#faq)
* [TypeScript](#typescript)
* [License](#license)

# Getting Started

## Dependencies

What you need to run this app:
* `node` and `npm` (Use [NVM](https://github.com/creationix/nvm))
* Ensure you're running Node (`v4.1.x`+) and NPM (`2.14.x`+)
* Visual Studio with Universal Windows App Development Tools

## Installing

* `fork` this repo
* `clone` your fork
* `npm install` to install all dependencies

## Running the app

After you have installed all dependencies you can now run the app with:

```bash
npm start
```

It will build the files to the /dist folder and watch for changes.

Launch Visual Studio and open the file `angular2-universal-windows-app.sln` at the root of the project.
Then launch the application with F5 (or using the menu debug > start debugging).

![app](https://cloud.githubusercontent.com/assets/265378/13549047/0e7d897c-e2fe-11e5-9885-e9b105ce0645.jpg)

## Developing

### Build files

* single run: `npm run build`
* build files and watch: `npm run watch`

# FAQ

#### How to include external angular 2 libraries ?

It's simple, just install the lib via npm and import it in your code when you need it. Don't forget that you need to configure some external libs in the [bootstrap](https://github.com/preboot/angular2-universal-windows-app/blob/master/src/bootstrap.ts) of your application.

### How to include external css files such as bootstrap.css ?

Just install the lib and import the css files in [vendor.ts](https://github.com/preboot/angular2-universal-windows-app/blob/master/src/vendor.ts). For example this is how to do it with bootstrap:

```sh
npm install bootstrap@4.0.0 --save
```

And in [vendor.ts](https://github.com/preboot/angular2-universal-windows-app/blob/master/src/vendor.ts) add the following:

```ts
import 'bootstrap/dist/css/bootstrap.css';
```

# TypeScript

> To take full advantage of TypeScript with autocomplete you would have to use an editor with the correct TypeScript plugins.

## Use a TypeScript-aware editor

We have good experience using these editors:

* [Visual Studio Code](https://code.visualstudio.com/)
* [Webstorm 11+](https://www.jetbrains.com/webstorm/download/)
* [Atom](https://atom.io/) with [TypeScript plugin](https://atom.io/packages/atom-typescript)
* [Sublime Text](http://www.sublimetext.com/3) with [Typescript-Sublime-Plugin](https://github.com/Microsoft/Typescript-Sublime-plugin#installation)

# License

[MIT](/LICENSE)
