// ## USO Updater, a Userscripts updater. This file contains all the Javasript logic for the updater.
// Feel free to scroll down for the annotated source code.  
//
// Designed to be simple to use and implement, while also complex and
// versitile if needed. There are two interfaces that you will need to
// know about:
//
// * The GET parameter API, where HTTP GET parameters modify this output
//   file
// * The Javascript API, which can be observed below.
//
// Most people put the updater URL in a `@require` metadata field within a Userscript, but really, you should
// just do whatever you want with it. Yay for freedom. But if you are 'most people', take a look at this sucker:
//
//     @require http://updater.usotools.co.cc/12345.js
//
// A quick GET parameter rundown: (The valid parameters are in bold)
// <code>http://updater.usotools.co.cc/**12345**.js?**api**=1&**lang**=en&**interval**=7&**update**=update</code>
//
// #### Required GET parameters:
// * **12345**: Replace this with your script ID number, good times.

// #### Optional GET parameters
// * **api**: Want the Javascript API? `1` for yes, `0` for no. Simple.
// * **lang**: Set this only if you want everybody to see the same language. Uses a two character language code.
//             If you like people seeing the updater in their home language, don't set it. `:D`
// * **interval**: Maximum number of days between updates. Minimum of 1
// * **update**:
//     * update: Direct install without bumping install count. How integral of you!
//     * install: Straight to the goods. Doesn't show the homepage unless your script is
//       naughty and un-listed. tut tut.
//     * show: The default one. Shows the homepage on update.
//
// ### Credits
// Thanks to the following for ideas / concepts / being cool:
//
// * [Photodeus](http://userscripts.org/users/photodeus) - The guy who posted the idea here: http://userscripts.org/topics/29195
// * [Jesse Andrews](http://userscripts.org/users/anotherjesse) - For being a awesome USO host, and giving tips along the way
// * [Marti Martz](http://userscripts.org/users/marti) - For arguing ideas to hell and back, then coming to general consensus
// * [Sizzlemctwizzle](http://userscripts.org/users/sizzle) - A man full of good ideas
// * Anyone else I missed, which is probably a lot. Edit your name in here and send me a pull / patch request :p
//
// **Anyways, onto the Javascript code we go!**


// Create our API reference
<?php if ( $api === true ) { ?>
if ( typeof USO !== 'object' )
	USO = {};

// Anonymous function wrapper to avoid collisions in the sandbox global context
<?php } ?>
(function( apiReference ) {

//## USOScript prototype
// USOScript: contructor Function
// A prototype to access various methods for
// handling USO User Scripts
var USOScript = function() {
	this.construct.apply( this, arguments );
	this.construct = null;
	return this;
};

// Extend the USOUpdater prototype
USOScript.prototype = {
	constructor: USOScript,
	construct: function( scriptID ) {
		this.scriptID = typeof scriptID === 'number' ? scriptID : this.scriptID;
	},

	// Public access to scriptID
	scriptID: parseInt( '<?=$script_id?>', 10 ),

	// Private remoteMeta
	_remoteMeta: (<?=$meta_string?>),

	// Public access to remoteMeta
	get remoteMeta() { return this._remoteMeta; },

	// Private localMeta
	_localMeta: null,

	// Public method of setting local meta
	set localMeta( rawE4X ) { this._localMeta = this.parseMeta( rawE4X.toString() ); },

	// Public access to localMeta
	get localMeta() { return this._localMeta; },

	// Combined meta. localMeta takes priority over remoteMeta
	// At present it will will overwrite Object keys completely if
	// one is present in localMeta.
	get combinedMeta() {
		if ( this.localMeta === null )
			return this.remoteMeta;

		var ret = {},
			key, key2;

		// We don't want to overwrite remoteMeta
		for ( key in this.remoteMeta )
			ret[ key ] = this.remoteMeta[ key ];

		// Do the merge
		for ( key in this.localMeta ) {
			if ( typeof this.localMeta[ key ] === typeof ret[ key ] ) {
				if ( typeof ret[ key ] === 'object' &&
						ret[ key ] instanceof Array === false ) {
					for ( key2 in this.localMeta[ key ] )
						ret[ key ][ key2 ] = this.localMeta[ key ][ key2 ];
				} else
					ret[ key ] = this.localMeta[ key ];
			} else
				ret[ key ] = this.localMeta[ key ];
		}

		return ret;
	},

	// parseMeta: Function
	// Parses meta string into a Javascript understandable form
	//
	// @param	metaString	[String]
	// 			The metadata string to parse
	parseMeta: function ( metaString ) {
		var ret = {};

		metaString.replace( /@(\S+?)(?::(\S+))?(?:[ \t]+([^\r\n]+)|\s+)/g, function( line, key, key2, value ) {
			if (key2 && key2.length > 0) {
				if (typeof ret[key] !== 'object')
					ret[key] = {};
				ret[key][key2] = value;
			}
			else if (typeof ret[key] === 'string')
				ret[key] = [ret[key], value];
			else if (ret[key] instanceof Array)
				ret[key].push(value);
			else
				ret[key] = value;
		} );
		return ret;
	},

	// updateRemoteMeta: Function
	// Updates the remoteMeta from USO
	updateRemoteMeta: function( callback ) {
		var fn = this;
		GM_xmlhttpRequest({
			url: 'https://userscripts.org/scripts/source/' + this.scriptID + '.meta.js',
			method: 'GET',
			onload: function( xhr ) {
				fn._remoteMeta = fn.parseMeta( xhr.responseText );
				if ( typeof callback === 'function' )
					callback.call( fn, fn.remoteMeta );
				fn = null;
			}
		});
	}
};
//## USOUpdater prototype
// USOUpdater: constructor Function
// A prototype that updates a USOScript instance
var USOUpdater = function() {
	this.construct.apply( this, arguments );
	this.construct = null;
	return this;
};

// Extend the USOUpdater prototype
USOUpdater.prototype = (function() {
	//## Private variables / methods

	// The max amount in hours
	var maxInterval = parseInt( '<?=$hours?>', 10 ),

	// The current increment
	increment = parseInt( GM_getValue('uso_updater/last_increment', 0 ), 10 ),

	// calculateInterval: Function
	// Calulates a time interval based on a increment
	//
	// @param	increment	[Number]
	calculateInterval = function( increment, max ) {
		var hours = Math.round( Math.exp( increment ) * ( 1 / ( Math.exp(4) / 24 ) ) );

		if ( 150 < hours )
			hours = Math.round( hours / 168 ) * 168;
		else if ( 20 < hours )
			hours = Math.round( hours / 24 ) * 24;
		if ( hours >= max )
			return max;

		return hours;
	},

	// checkUpdateNeeded: Function
	// Check interval against last update time
	checkUpdateNeeded = function() {
		var interval = calculateInterval( increment, maxInterval ) * 60 * 60;
		if ( GM_getValue( 'uso_updater/enabled', true ) === true &&
				( new Date().getTime() / 1000 - parseInt( GM_getValue( 'uso_updater/last_update', 1 ), 10 ) >= interval ) ) //'
			this.update( false );
	};

	//## Public variables / methods
	return {
	constructor: USOUpdater,
	construct: function( usoScript ) {
		this.script = usoScript;

		// Make sure we are in the correct environment
		try {
			if ( typeof GM_xmlhttpRequest === 'function' &&
					top.location.href === location.href )
				checkUpdateNeeded.call( this );
		} catch ( error ) {
			if ( typeof GM_xmlhttpRequest === 'function' )
				checkUpdateNeeded.call( this );
		}
	},

	// Public access to USOScript Object
	script: null,

	// Return true when enabled, false otherwise
	get enabled() { return GM_getValue( 'uso_updater/enabled', false ); },
	set enabled( boolean ) { GM_setValue( 'uso_updater/enabled', boolean === true ? true : false );},

	// Interface for setting script localMeta
	set localMeta( rawE4X ) { this.script.localMeta = rawE4X; },

	// Contains the localized strings
	locale: (<?=$locale_string?>),

	// Contains the update URL to direct to.
	// Can be changed by user
	updateUrl: '<?=$update_url?>',

	// update: Function
	// Check to see if an update is needed, then takes action
	update: function( forced ) {
		var fn = this,
			previousMeta = this.script.remoteMeta;

		// Fetch meta from USO and check for updates
		this.script.updateRemoteMeta( function( meta ) {
			if ( typeof meta['uso']['version'] === 'string' &&
					typeof meta['name'] === 'string' &&
					typeof meta['namespace'] === 'string' ) {
				var details = fn.script;
				details.newVersion = parseInt( meta['uso']['version'], 10 );
				details.currentVersion = parseInt( previousMeta['uso']['version'], 10 );

				// Check to see if we have newer version we haven't seen
				if ( details.newVersion > details.currentVersion &&
						details.currentVersion >= parseInt( GM_getValue( 'uso_updater/new_version', 0 ), 10 ) ) {
					GM_setValue( 'uso_updater/last_increment', 1 );
					GM_setValue( 'uso_updater/new_version', details.newVersion );
				} else if ( forced !== true )
					GM_setValue( 'uso_updater/last_increment', 1 + increment );

				// See if the name or namespace has changed
				if ( previousMeta['name'] !== meta['name'] ||
						previousMeta['namespace'] !== meta['namespace'] )
					GM_setValue( 'uso_updater/enabled', false );

				// Trigger the callback
				fn.onUpdate.call( fn, details, fn.locale, forced === true ? true : false );
			} else
				GM_setValue( 'uso_updater/enabled', false );

			GM_setValue( 'uso_updater/last_update', Math.floor( ( new Date().getTime() ) / 1000 ) );
			fn = null;
		} );
	},

	// Set to true to enable force updating from menu
	set menuUpdate( boolean ) {
		if ( boolean === true ) {
			var fn = this;
			GM_registerMenuCommand( this.script.combinedMeta['name'] + ': ' +
				this.locale['menuCheckUpdates'], function() { fn.update.call( fn, true ); } );
		}
	},

	// Set to true to enable turning off updater from menu
	set menuToggle( boolean ) {
		if ( boolean === true ) {
			var fn = this;
			GM_registerMenuCommand( this.script.combinedMeta['name'] + ': ' +
					this.locale['menuToggle'], function() {
				if ( GM_getValue( 'uso_updater/enabled', true ) === true ) {
					alert( fn.script.combinedMeta['name'] + ': ' + fn.locale['updaterOff'] );
					GM_setValue( 'uso_updater/enabled', false );
				} else {
					alert( fn.script.combinedMeta['name'] + ': ' + fn.locale['updaterOn'] );
					GM_setValue( 'uso_updater/enabled', true );
				}
			} );
		}
	},

	// onUpdate: Function
	// The main update callback
	//
	// @param	details	[USOScript Object]
	// @param	locale	[Object]
	// 			Contains localized strings
	onUpdate: function( details, locale, forced ) {
		var meta = details.combinedMeta;
		if (details.newVersion > details.currentVersion) {
			if ( confirm( meta['name'] + ': ' + locale['updateAvailable'] ) )
				GM_openInTab( this.updateUrl );
		} else if ( forced )
			alert( meta['name'] + ': ' + locale['updateUnavailable'] );
	}
};})();

// End of anonymous function wrapper. Pass in variable to attach ourselves to.
<?php if ( $api === true ) { ?>
apiReference.script = USOScript;
apiReference.updater = new USOUpdater( new USOScript() );
})( USO );<?php }
// Call updater
else { ?>
new USOUpdater( new USOScript() );
})();<?php } ?>
