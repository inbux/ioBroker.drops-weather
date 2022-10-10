'use strict';
const cheerio = require('cheerio');
const dayjs = require('dayjs');
require('dayjs/locale/de');

const axios = require('axios').default;
let interval = null;
let starttimeout;

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require("fs");

class DropsWeather extends utils.Adapter {
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'drops-weather',
		});

		this.drops;
		this.location = '';

		this.on('ready', this.onReady.bind(this));
		//this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}
	//----------------------------------------------------------------------------------------------------
	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here
		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		//	this.log.info('config option1: ' + this.config.option1);
		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/

		// use system configuration or user defined location
		await this.getLocation();
		await this.getLanguage();

		this.drops = axios.create({
			baseURL: `https://drops.live/`,
			//insecureHTTPParser: true,
			timeout: 15000,
			headers: {
				'User-Agent': 'Mozilla',
			},
		});
		// wait some time, because getting system configuration location take some time
		// not really a smart way just to wait, but how can it be done ?
		starttimeout = setTimeout(() => {
			if (this.location === null || this.location === '') {
				this.log.error(`Location not set - please check instance configuration of ${this.namespace}`);
			} else {
				this.log.info('Reading data from : https://drops.live/' + this.location);
				this.readDataFromServer();
			}
		}, 2000);

		interval = setInterval(() => {
			if (this.location === null || this.location === '') {
				clearInterval(interval);
			} else {
				this.readDataFromServer();
			}
		}, 5 * 60 * 1000);
	}
	//----------------------------------------------------------------------------------------------------
	async getLocation() {
		if (this.config.useSystemLocation) {
			this.log.debug('using systems configuration location');
			this.getForeignObject('system.config', (err, state) => {
				if (
					err ||
					state === undefined ||
					state === null ||
					state.common.longitude === '' ||
					state.common.latitude === ''
				) {
					this.log.error(
						`longitude/latitude not set in system-config- please check instance configuration of ${this.namespace}`,
					);
				} else {
					this.location = state.common.latitude + ',' + state.common.longitude;
				}
			});
		} else {
			this.location = this.config.location;
		}
	}
	//----------------------------------------------------------------------------------------------------
	async getLanguage() {
		this.log.debug('getting system language');
		this.getForeignObject('system.config', (err, state) => {
			if (err || state === undefined || state === null || state.common.language === '') {
				this.log.warn(`no language set in system configuration of ioBroker`);
			} else {
				this.log.debug(state.common.language);
				if (state.common.language === 'de') dayjs.locale('de');
				else dayjs.locale('en');
			}
		});
	}
	//----------------------------------------------------------------------------------------------------
	async readDataFromServer() {
		try {
			this.log.debug('Reading data from : https://drops.live/' + this.location);
			let weatherdataFound = false;

			// @ts-ignore
			const response = await this.drops.get(encodeURI(this.location), { responseType: 'blob' });
			if (response.status == 200) {
				this.log.debug('Ok. Parsing data...');
				// if GET was successful...
				const $ = cheerio.load(response.data);
				$('script').each((_, e) => {
					const row = $(e).text();
					//  weatherData array found ?
					if (row.indexOf('var weatherData') != -1) {
						this.log.debug('weatherData found');
						let data = row.substring(row.indexOf('var weatherData'));
						data = data.split('=')[1];
						// locationData array found ? This is normally the next code line in HTML
						if (data.indexOf('var locationData') != -1) {
							this.log.debug('locationData found');

							data = data.substring(0, data.indexOf('var locationData'));
							// end of weatherData array found ?
							if (data.indexOf('}]};') != -1) {
								weatherdataFound = true;

								data = data.substring(0, data.indexOf('}]};') + 3);

								const dataJSON = JSON.parse(data);

								this.log.debug('creating 5 min states');
								this.createStateData(dataJSON.minutes, 'data_5min');
								this.log.debug('creating 1 hour states');
								this.createStateData(dataJSON.hours, 'data_1h');
							} else this.log.debug('end of array NOT found');
						} else this.log.debug('locationData NOT found');
					}
				});
			}
			if (!weatherdataFound) {
				this.log.warn('no weatherData found in HTML');
			}
		} catch (error) {
			this.log.warn(error);
		}
	}
	//----------------------------------------------------------------------------------------------------
	async createStateData(data, channel) {
		try {
			let JSONdata_temp = [];
			let JSONdata_rain = [];
			let raindata = [];
			let tempdata = [];
			let isRainingNow = false;
			let rainStartsAt = '-1';
			let rainStartAmount = 0;
			let dateformat = 'HH:mm';

			if (channel == 'data_1h') dateformat = 'dd HH:mm';
			//	this.log.info(JSON.stringify(data));

			if (data[0].rain > 0) isRainingNow = true;
			await this.setStateAsync(channel + '.isRainingNow', { val: isRainingNow, ack: true });

			await this.setStateAsync(channel + '.timestamp', { val: data[0].date, ack: true });
			await this.setStateAsync(channel + '.actualRain', { val: data[0].rain, ack: true });

			for (const i in data) {
				raindata.push(data[i].rain);
				tempdata.push(data[i].temp);
				const item_temp = {};
				const item_rain = {};

				const date = dayjs(data[i].date);

				if (rainStartsAt == '-1')
					if (data[i].rain > 0) {
						rainStartsAt = date.format('YYYY-MM-DDTHH:mm:ssZ');
						rainStartAmount = data[i].rain;
					}
				//this.log.debug(date.format('HH:mm').toString());

				item_temp['label'] = date.format(dateformat).toString();
				item_temp['value'] = data[i].temp.toString();
				JSONdata_temp.push(item_temp);

				item_rain['label'] = date.format(dateformat).toString();
				item_rain['value'] = data[i].rain.toString();
				JSONdata_rain.push(item_rain);
			}
			JSONdata_rain = JSON.parse(JSON.stringify(JSONdata_rain));
			JSONdata_temp = JSON.parse(JSON.stringify(JSONdata_temp));

			raindata = JSON.parse(JSON.stringify(raindata));
			tempdata = JSON.parse(JSON.stringify(tempdata));

			this.log.debug(`Temperature (${channel}): ` + JSON.stringify(JSONdata_temp));
			this.log.debug(`Rain (${channel}): ` + JSON.stringify(JSONdata_rain));

			await this.setStateAsync(channel + '.chartTemperature', {
				val: JSON.stringify(JSONdata_temp),
				ack: true,
			});
			await this.setStateAsync(channel + '.chartRain', { val: JSON.stringify(JSONdata_rain), ack: true });
			await this.setStateAsync(channel + '.raindata', { val: JSON.stringify(raindata), ack: true });
			await this.setStateAsync(channel + '.tempdata', { val: JSON.stringify(tempdata), ack: true });
			await this.setStateAsync(channel + '.rainStartsAt', { val: rainStartsAt, ack: true });
			await this.setStateAsync(channel + '.startRain', { val: rainStartAmount, ack: true });
		} catch (error) {
			this.log.error(error);
		}
	}
	//----------------------------------------------------------------------------------------------------
	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			clearInterval(interval);
			clearTimeout(starttimeout);
			callback();
		} catch (e) {
			callback();
		}
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new DropsWeather(options);
} else {
	// otherwise start the instance directly
	new DropsWeather();
}
