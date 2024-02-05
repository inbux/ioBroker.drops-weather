'use strict';
const cheerio = require('cheerio');
const dayjs = require('dayjs');
require('dayjs/locale/de');

const axios = require('axios').default || require('axios'); // to avoid error message in vscode

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
		//await this.getLocation();
		await this.getLanguage();

		this.drops = axios.create({
			baseURL: `https://www.drops.live/de-de/city/`,
			//insecureHTTPParser: true,
			timeout: 15000,
			headers: {
				'User-Agent': 'Mozilla',
			},
		});
		// wait some time, because getting system configuration location take some time
		// not really a smart way just to wait, but how can it be done ?
		starttimeout = setTimeout(() => {
			if (this.config.citycode === null || this.config.citycode === '') {
				this.log.error(`City code not set - please check instance configuration of ${this.namespace}`);
			} else {
				this.log.info('Reading data from : https://www.drops.live/de-de/city/' + this.config.citycode);
				this.readDataFromServer();
			}
		}, 2000);

		interval = setInterval(() => {
			if (this.config.citycode === null || this.config.citycode === '') {
				clearInterval(interval);
			} else {
				this.readDataFromServer();
			}
		}, 5 * 60 * 1000);
	}

	//----------------------------------------------------------------------------------------------------
	async getLanguage() {
		try {
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
		} catch (error) {
			this.log.warn(error);
		}
	}
	//----------------------------------------------------------------------------------------------------
	async readDataFromServer() {
		try {
			// @ts-ignore
			this.log.debug('Reading data from : https://www.drops.live/de-de/city/' + this.config.citycode);
			let weatherdataFound = false;

			// @ts-ignore
			const response = await this.drops.get(encodeURI(this.config.citycode), { responseType: 'blob' });
			if (response.status == 200) {
				this.log.debug('Ok. Parsing data...');
				// if GET was successful...
				const $ = cheerio.load(response.data);
				$('script').each((_, e) => {
					const row = $(e).text();
					// series data found ?
					if (row.indexOf('series') != -1) {
						this.log.debug('weatherData found');
						let data = row.substring(row.indexOf('series'));

						if (data.indexOf('}}},') != -1) {
							weatherdataFound = true;
							data = data.substring(7, data.indexOf('}}},') + 3);
							data = data.replace('2h', 'data2h');
							data = data.replace('24h', 'data24h');

							const dataJSON = JSON.parse(data);
							this.log.debug('creating 5 min states');

							this.createStateData(dataJSON.data2h.data, 'data_5min');
							this.log.debug('creating 1 hour states');
							this.createStateData(dataJSON.data24h.data, 'data_1h');
						} else this.log.debug('end of data in series NOT found');
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
			let JSONdata_rain = [];
			let raindata = [];
			let isRainingNow = false;
			let rainStartsAt = '-1';
			let rainStartAmount = 0;
			let dateformat = 'HH:mm';

			if (channel == 'data_1h') dateformat = 'dd HH:mm';
			//	this.log.info(JSON.stringify(data));

			if (data[0].precipitationrate > 0) isRainingNow = true;
			this.setStateAsync(channel + '.isRainingNow', { val: isRainingNow, ack: true });

			await this.setStateAsync(channel + '.timestamp', { val: data[0].time, ack: true });
			await this.setStateAsync(channel + '.actualRain', { val: data[0].precipitationrate, ack: true });

			for (const i in data) {
				raindata.push(data[i].precipitationrate);

				const item_rain = {};

				const date = dayjs(data[i].time);

				if (rainStartsAt == '-1')
					if (data[i].precipitationrate > 0) {
						rainStartsAt = date.format('YYYY-MM-DDTHH:mm:ssZ');
						rainStartAmount = data[i].c;
					}
				//this.log.debug(date.format('HH:mm').toString());

				item_rain['label'] = date.format(dateformat).toString();
				item_rain['value'] = data[i].precipitationrate.toString();
				JSONdata_rain.push(item_rain);
			}
			JSONdata_rain = JSON.parse(JSON.stringify(JSONdata_rain));

			raindata = JSON.parse(JSON.stringify(raindata));

			this.log.debug(`Rain (${channel}): ` + JSON.stringify(JSONdata_rain));

			await this.setStateAsync(channel + '.chartRain', { val: JSON.stringify(JSONdata_rain), ack: true });
			await this.setStateAsync(channel + '.raindata', { val: JSON.stringify(raindata), ack: true });
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
