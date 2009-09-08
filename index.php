<?php

if( !isset( $_GET['scriptid'] ) )
	exit;
else
	$script_id = (int)stripslashes( $_GET['scriptid'] );

if ( !$script_id > 0 )
	exit;

$ch = curl_init();
curl_setopt( $ch, CURLOPT_URL, 'http://userscripts.org/scripts/source/' . $script_id . '.meta.js' );
curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
$output = curl_exec( $ch );
curl_close( $ch );

preg_match_all( '/@(\S+?)(?::(\S+))?(?:[ \t]+([^\r\n]+)|\s+)/', $output, $meta );

foreach ( $meta[1] as $key => $value ) {
	if ( $meta[2][ $key ] && strlen( $meta[2][ $key ] ) > 0 ) {
		$meta_array[ $value ][ $meta[2][ $key ] ] = $meta[3][ $key ];
		$meta_safe[ $value ][ $meta[2][ $key ] ] = addslashes ( $meta[3][ $key ] );
	}
	else if ( is_string( $meta_array[ $value ] ) ) {
		$meta_array[ $value ] = array(
			$meta_array[ $value ],
			$meta[3][ $key ]
		);
		$meta_safe[ $value ] = array(
			$meta_array[ $value ],
			addslashes( $meta[3][ $key ] )
		);
	}
	else if ( is_array( $meta_array[ $value ] ) ) {
		$meta_array[ $value ][] = $meta[3][ $key ];
		$meta_safe[ $value ][] = addslashes( $meta[3][ $key ] );
	}
	else {
		$meta_array[ $value ] = $meta[3][ $key ];
		$meta_safe[ $value ] = addslashes( $meta[3][ $key ] );
	}
}

$meta = $meta_safe;
$meta_string = json_encode( $meta_array );
unset( $meta_array );

if( isset( $_GET['interval'] ) )
	$days = (int)( stripslashes( $_GET['interval'] ) );
else
	$days = 7;

if ( $days < 1 )
	$days = 7;

$hours = $days * 24;
unset( $days );

if ( isset( $_GET['api'] ) && ( (int)$_GET['api'] === 1 || strtolower( $_GET['api']) === 'true' ) )
	$api = true;
else
	$api = false;

if ( isset( $meta["unlisted"] ) )
	$_GET["update"] = "show";

switch ( isset( $_GET["update"] ) ? strtolower( $_GET["update"] ) : "show" ) {
	case 'update':
		$update_url = "https://userscripts.org/scripts/source/" . $script_id . ".user.js?update.user.js";
		break;
	case 'install':
		$update_url = "https://userscripts.org/scripts/source/" . $script_id . ".user.js";
		break;
	case 'show':
	default:
		$update_url = "http://userscripts.org/scripts/show/" . $script_id . "/";
		break;
}

require_once 'lib/classes/language.php';

if( isset( $_GET['lang'] ) )
	$uso_language = new USO_language( stripslashes( $_GET['lang'] ) );
else
	$uso_language = new USO_language();

$uso_language->strings = array(
	// English
	"en"	=>	array(
		"updateAvailable"		=>	"An update is available for this script. Do you want to update now?",
		"updateUnavailable"		=>	"Has no updates available at this current time.",
		"menuCheckUpdates"		=>	"Check for updates.",
		"menuToggle"			=>	"Toggle auto updates.",
		"updaterOff"			=>	"Automatic Updates are now off.",
		"updaterOn"				=>	"Automatic Updates are now on."
	)
);
$uso_language->default = "en";

$locale_string = json_encode( $uso_language->translate() );

header( 'Content-Type: application/x-javascript; charset=utf-8' );

include_once 'lib/resource/updater.js';

?>
