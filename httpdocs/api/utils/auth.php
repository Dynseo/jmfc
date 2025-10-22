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
        $endpoint = rtrim($superloginUrl, '/') . '/auth/user';

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
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            error_log('Superlogin session fetch failed: ' . $curlError);
            return null;
        }

        if ($httpCode !== 200) {
            error_log('Superlogin responded with HTTP ' . $httpCode . ' when validating token');
            return null;
        }

        $session = json_decode($response, true);
        if (!is_array($session)) {
            error_log('Unable to decode Superlogin session response');
            return null;
        }

        return $session;
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
