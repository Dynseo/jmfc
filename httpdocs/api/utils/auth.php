<?php
/**
 * Helper functions for validating SuperLogin tokens and roles.
 */

if (!function_exists('jmfc_get_authorization_token')) {
    function jmfc_get_authorization_token(): ?string
    {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        if (!$headers) {
            // Fallback for environments without getallheaders (e.g. nginx + FastCGI)
            foreach ($_SERVER as $name => $value) {
                if (strpos($name, 'HTTP_') === 0) {
                    $headerName = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                    $headers[$headerName] = $value;
                }
            }
        }

        foreach ($headers as $key => $value) {
            if (strcasecmp($key, 'Authorization') === 0) {
                if (preg_match('/Bearer\s+(.*)$/i', trim($value), $matches)) {
                    return $matches[1];
                }
            }
        }

        return null;
    }
}

if (!function_exists('jmfc_fetch_superlogin_session')) {
    function jmfc_fetch_superlogin_session(?string $token): ?array
    {
        if (!$token) {
            return null;
        }

        $superloginUrl = getenv('JMFC_SUPERLOGIN_URL');
        if (!$superloginUrl) {
            $superloginUrl = 'https://jmfc.dynseo.com:3001';
        }

        $verifySslEnv = getenv('JMFC_SUPERLOGIN_VERIFY_SSL');
        $verifySsl = true;
        if ($verifySslEnv !== false && $verifySslEnv !== '') {
            $value = trim((string)$verifySslEnv);
            if ($value === '0' || strcasecmp($value, 'false') === 0 || strcasecmp($value, 'off') === 0 || strcasecmp($value, 'no') === 0) {
                $verifySsl = false;
            }
        }

        $caInfo = getenv('JMFC_SUPERLOGIN_CAINFO');
    $paths = ['/auth/session', '/auth/user'];
        $lastError = null;
        $sawNotFound = false;

        $isExpectedStatus = static function ($status) {
            return in_array((int)$status, [401, 403, 404], true);
        };

        foreach ($paths as $path) {
            $endpoint = rtrim($superloginUrl, '/') . $path;

            $ch = curl_init($endpoint);
            $headers = [
                'Authorization: Bearer ' . $token,
                'Accept: application/json'
            ];
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_SSL_VERIFYPEER => $verifySsl,
                CURLOPT_SSL_VERIFYHOST => $verifySsl ? 2 : 0,
            ]);

            if ($caInfo) {
                curl_setopt($ch, CURLOPT_CAINFO, $caInfo);
            }

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($response === false) {
                $lastError = 'cURL error contacting ' . $endpoint . ': ' . $curlError;
                continue;
            }

            if ($httpCode === 404) {
                $sawNotFound = true;
                continue;
            }

            if ($httpCode !== 200) {
                if (!$isExpectedStatus($httpCode)) {
                    error_log('Superlogin responded with HTTP ' . $httpCode . ' when validating token via ' . $endpoint);
                }
                return null;
            }

            $session = json_decode($response, true);
            if (!is_array($session)) {
                $lastError = 'Unable to decode JSON from ' . $endpoint;
                continue;
            }

            return $session;
        }

        if ($lastError) {
            error_log('Superlogin session fetch failed: ' . $lastError);
        } elseif ($sawNotFound) {
            // Both endpoints missing is most likely an outdated token or legacy Superlogin.
            error_log('Superlogin session validation endpoints responded with 404. Treating token as invalid.');
        }
        return null;
    }
}

if (!function_exists('jmfc_is_admin_session')) {
    function jmfc_is_admin_session(?array $session): bool
    {
        if (!$session) {
            return false;
        }
        if (isset($session['roles']) && is_array($session['roles'])) {
            foreach ($session['roles'] as $role) {
                if ($role === 'admin' || $role === 'superadmin') {
                    return true;
                }
            }
        }
        return false;
    }
}

if (!function_exists('jmfc_require_session')) {
    function jmfc_require_session(bool $adminOnly = false): array
    {
        $token = jmfc_get_authorization_token();
        if (!$token) {
            http_response_code(401);
            echo json_encode([
                'error' => 'unauthorized',
                'message' => 'Missing or invalid authorization token'
            ]);
            exit;
        }

        $session = jmfc_fetch_superlogin_session($token);
        if (!$session) {
            http_response_code(401);
            echo json_encode([
                'error' => 'unauthorized',
                'message' => 'Session validation failed'
            ]);
            exit;
        }

        if ($adminOnly && !jmfc_is_admin_session($session)) {
            http_response_code(403);
            echo json_encode([
                'error' => 'forbidden',
                'message' => 'Administrator privileges required'
            ]);
            exit;
        }

        return $session;
    }
}
