'use strict';
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const axios = require('axios').default;
let interval = null;

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

		this.drops = null;

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
		//	this.log.info('config option2: ' + this.config.option2);
		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		/*	await this.setObjectNotExistsAsync('testVariable', {
			type: 'state',
			common: {
				name: 'testVariable',
				type: 'boolean',
				role: 'indicator',
				read: true,
				write: true,
			},
			native: {},
		});
*/
		if (!this.config.location) {
			this.log.error(`Location is empty - please check instance configuration of ${this.namespace}`);
			return;
		}

		this.drops = axios.create({
			baseURL: `https://drops.live/`,
			//insecureHTTPParser: true,
			timeout: 5000,
			headers: {
				'User-Agent': 'Mozilla',
			},
		});

		this.readDataFromServer();

		interval = setInterval(() => {
			this.readDataFromServer();
		}, 5 * 60 * 1000);
	}
	//----------------------------------------------------------------------------------------------------
	async readDataFromServer() {
		try {
			this.log.info('Reading data from : https://drops.live/' + this.config.location);

			const response = await this.drops.get(this.config.location);
			if (response.status == 200) {
				const $ = cheerio.load(response.data);
				$('script').each((_, e) => {
					const row = $(e).text();
					if (row.indexOf('var weatherData') != -1) {
						let data = row.substring(row.indexOf('var weatherData'));
						data = data.split('=')[1];
						data = data.substring(0, data.indexOf('var locationData'));
						data = data.substring(0, data.indexOf('}]};') + 3);
						const dataJSON = JSON.parse(data);

						this.createStateData(dataJSON.minutes, 'data_5min');
						this.createStateData(dataJSON.hours, 'data_1h');
					}
				});
			}
		} catch (error) {
			this.log.error(error);
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
			let dateformat = 'HH:mm';

			if (channel == 'data_1h') dateformat = 'dd HH:mm';
			//	this.log.info(JSON.stringify(data));

			if (data[0].rain > 0) isRainingNow = true;
			await this.setStateAsync(channel + '.isRainingNow', { val: isRainingNow, ack: true });

			await this.setStateAsync(channel + '.timestamp', { val: data[0].date, ack: true });

			for (const i in data) {
				raindata.push(data[i].rain);
				tempdata.push(data[i].temp);
				const item_temp = {};
				const item_rain = {};

				const date = dayjs(data[i].date);

				if (rainStartsAt == '-1') if (data[i].rain > 0) rainStartsAt = date.format(dateformat).toString();

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

			this.log.debug('Temperature: ' + JSON.stringify(JSONdata_temp));
			this.log.debug('Rain: ' + JSON.stringify(JSONdata_rain));

			await this.setStateAsync(channel + '.chartTemperature', {
				val: JSON.stringify(JSONdata_temp),
				ack: true,
			});
			await this.setStateAsync(channel + '.chartRain', { val: JSON.stringify(JSONdata_rain), ack: true });
			await this.setStateAsync(channel + '.raindata', { val: JSON.stringify(raindata), ack: true });
			await this.setStateAsync(channel + '.tempdata', { val: JSON.stringify(tempdata), ack: true });
			await this.setStateAsync(channel + '.rainStartsAt', { val: rainStartsAt, ack: true });
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
