<?php

class USO_language
{
	public $language_code = "en";
	public $default = "en";
	public $strings = array();
	
	function __construct( $language_code = false )
	{
		if ( $language_code !== false )
			$this->language_code = $language_code;
		else
			$this->language_code = $this->detect();

		return;
	}
	
	public function translate()
	{
		// Have we got the language pre-defined?
		if ( isset( $this->strings[ $this->language_code ] ) )
			return $this->strings[ $this->language_code ];

		// Try translate it using Google translate
		else if ( $translation = $this->google_translate( $this->language_code, $this->strings[ $this->default ], $this->default ) )
			return $translation;

		// Default
		else if ( isset( $this->strings[ $this->default ] ) )
			return $this->strings[ $this->default ];

		// Shouldn't happen
		return false;
	}

	private function detect()
	{
		if ( isset( $_SERVER["HTTP_ACCEPT_LANGUAGE"] ) )
		{
			preg_match( '/(.+?)(?:,|$)/', $_SERVER["HTTP_ACCEPT_LANGUAGE"], $language );
			$language = $language[1];

			switch ( $language_code = substr( $language, 0, 2 ) )
			{
				case 'us':
					$language = "en";
					break;
				case 'zh':
					break;
				default:
					$language = $language_code;
					break;
			}
		}
		else
			$language = $this->default;
		
		return $language;
	}

	public function google_translate( $destination, $string, $from )
	{
		// Check the cache first
		if ( file_exists( 'uso_language.cache' ) )
		{
			$cache_handler = fopen( 'uso_language.cache', 'rb' );
			$cache = unserialize( fread( $cache_handler, filesize( 'uso_language.cache' ) ) );
			fclose( $cache_handler );

			if ( isset( $cache[ $destination ][ $from ] ) &&
					( time() - $cache[ $destination ][ $from ]['last_update'] ) < ( 60 * 60 * 12 ) )
			{
				return $cache[ $destination ][ $from ]['data'];
			}
			else if ( isset( $cache[ $destination ][ $from ] ) )
				unset( $cache[ $destination ][ $from ] );

			$cache_handler = fopen( 'uso_language.cache', 'wb' );
			fwrite( $cache_handler, serialize( $cache ) );
			fclose( $cache_handler );
		}

		$url = "http://ajax.googleapis.com/ajax/services/language/translate?v=1.0&langpair="
			. urlencode( $from ) . "|"
			. urlencode( $destination ) . "&";

		if( is_array( $string ) )
		{
			foreach ( $string as $value )
			{
				$url .= "q=" . urlencode( $value ) . "&";
			}
			$url = substr( $url, 0, -1 );
		}
		else if ( is_string( $string ) )
			$url .= "q=" . urlencode( $string );

		$ch = curl_init();
		curl_setopt( $ch, CURLOPT_URL, $url );
		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
		curl_setopt( $ch, CURLOPT_REFERER, "http://" . $_SERVER['SERVER_NAME'] );
		$response = curl_exec($ch);
		curl_close($ch);

		if ( $response !== false )
		{
			$response = json_decode( $response );

			if ( $response->responseStatus === 200 && is_array( $string ) === true )
			{
				$array = array();
				$i = 0;

				foreach ( $string as $key => $value )
				{
					$array[ $key ] = addslashes( $this->unhtmlentities( $response->responseData[ $i ]->responseData->translatedText ) );
					$i++;
				}

				$cache[ $destination ][ $from ]['last_update'] = time();
				$cache[ $destination ][ $from ]['data'] = $array;

				$cache_handler = fopen( 'uso_language.cache', 'wb' );
				fwrite( $cache_handler, serialize( $cache ) );
				fclose( $cache_handler );

				return $array;
			}
			else if ( $response->responseStatus === 200 && is_string( $string ) === true )
			{
				$locale = addslashes( $this->unhtmlentities( $response->responseData->translatedText ) );

				$cache[ $destination ][ $from ]['last_update'] = time();
				$cache[ $destination ][ $from ]['data'] = $locale;

				$cache_handler = fopen( 'uso_language.cache', 'wb' );
				fwrite( $cache_handler, serialize( $cache ) );
				fclose( $cache_handler );

				return $locale;
			}
		}

		return false;
	}

	private function unhtmlentities( $string )
	{
		$string = preg_replace( '~&#x([0-9a-f]+);~ei', 'chr(hexdec("\\1"))', $string );
		$string = preg_replace( '~&#([0-9]+);~e', 'chr("\\1")', $string );

		$trans_tbl = get_html_translation_table( HTML_ENTITIES );
		$trans_tbl = array_flip( $trans_tbl );

		return strtr( $string, $trans_tbl );
	}
}

?>