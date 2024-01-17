![Logo](admin/drops-weather.png)

# ioBroker.drops-weather

[![NPM version](https://img.shields.io/npm/v/iobroker.drops-weather.svg)](https://www.npmjs.com/package/iobroker.drops-weather)
[![Downloads](https://img.shields.io/npm/dm/iobroker.drops-weather.svg)](https://www.npmjs.com/package/iobroker.drops-weather)
![Number of Installations](https://iobroker.live/badges/drops-weather-installed.svg)
![Snyk Vulnerabilities for npm package](https://img.shields.io/snyk/vulnerabilities/npm/iobroker.drops-weather?label=npm%20vulnerabilities&style=flat-square)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/iobroker.drops-weather?label=npm%20dependencies&style=flat-square)

![GitHub](https://img.shields.io/github/license/inbux/iobroker.drops-weather?style=flat-square)
![Test and Release](https://github.com/inbux/ioBroker.drops-weather/workflows/Test%20and%20Release/badge.svg)
![Snyk Vulnerabilities for GitHub Repo](https://img.shields.io/snyk/vulnerabilities/github/inbux/iobroker.drops-weather?label=repo%20vulnerabilities&logo=github&style=flat-square)

<!-- ![Current version in stable repository](https://iobroker.live/badges/drops-weather-stable.svg) -->
<!-- [![NPM](https://nodei.co/npm/iobroker.drops-weather.png?downloads=true)](https://nodei.co/npm/iobroker.drops-weather/) -->

## drops-weather adapter for ioBroker

Reading rain and temperature data from https://drops.live

## Features

This adapter reads the rain and temperature data in an interval of 5 minutes from the website.
There is a chart datapoint, which can directly be used by the BarChart widget from the Material Designs widgets.
![Logo](img/ChartDrops2.png)

The 5 minutes and 1h data is stored in different states.
![Logo](img/statesDrops.png)

## Configuration

You can use the GPS coordinates that are stored in the system configuration of the ioBroker or you define your own location using a city name or your own GPS coordinates.

## Changelog

<!--
	Placeholder for the next version (at the beginning of the line):
	-   (inbux)

	### **WORK IN PROGRESS**
-->

### **WORK IN PROGRESS**

-   (inbux) changed URL from drops.live to www.drops.live (thanks to Marc-Berg)
-   (inbux) small changes because of axios update
-   (inbux) changed units to mm/h

### 0.2.1 (2022-10-02)

-   (inbux) added actualRain
-   (inbux) reading system language for weekdays localization
-   (inbux) changed rainStartsAt to timestamp
-   (inbux) changed most log messages to debug to keep log cleaner
-   (inbux) updated README.md

### 0.2.0 (2022-10-01)

-   (inbux) added use of system configuration for gps coordinates
-   (inbux) axios timeout increased
-   (inbux) changed some logs from error to warn
-   (inbux) added some more error handling and log messages
-   (inbux) fixed problem with city containing umlauts

### 0.1.1 (2022-09-30)

-   (inbux)

### 0.1.0 (2022-09-30)

-   (inbux)

### v0.0.1 (2022-09-30)

-   (inbux) initial release

## License

MIT License

Copyright (c) 2024 inbux <inbux.development@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
