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

        $couchUrl = getenv('JMFC_COUCH_URL') ?: getenv('COUCH_DB_URL') ?: 'http://127.0.0.1:5984';
        $couchUser = getenv('JMFC_COUCH_USER');
        $couchPassword = getenv('JMFC_COUCH_PASSWORD');
        $userDb = getenv('JMFC_COUCH_USER_DB');

        if (($couchUser === false || $couchUser === null || $couchUser === '')
            || ($couchPassword === false || $couchPassword === null)
            || ($userDb === false || $userDb === null || $userDb === '')) {
            $envPath = dirname(__DIR__, 3) . '/config/.env';
            if (is_file($envPath) && is_readable($envPath)) {
                $envValues = parse_ini_file($envPath, false, INI_SCANNER_RAW);
                if (is_array($envValues)) {
                    if (($couchUser === false || $couchUser === null || $couchUser === '') && isset($envValues['COUCH_DB_USER'])) {
                        $couchUser = $envValues['COUCH_DB_USER'];
                    }
                    if (($couchPassword === false || $couchPassword === null) && isset($envValues['COUCH_DB_PASSWORD'])) {
                        $couchPassword = $envValues['COUCH_DB_PASSWORD'];
                    }
                    if (($userDb === false || $userDb === null || $userDb === '') && isset($envValues['COUCH_DB_USER_DB'])) {
                        $userDb = $envValues['COUCH_DB_USER_DB'];
                    }
                }
            }
        }

        if ($couchUser === false || $couchUser === null || $couchUser === '') {
            $couchUser = getenv('COUCH_DB_USER');
        }

        if ($couchPassword === false || $couchPassword === null) {
            $couchPassword = getenv('COUCH_DB_PASSWORD');
        }

        if ($userDb === false || $userDb === null || $userDb === '') {
            $userDb = getenv('COUCH_DB_USER_DB') ?: 'auth-users';
        }

        $viewUrl = rtrim($couchUrl, '/') . '/' . rawurlencode($userDb) . '/_design/auth/_view/session';
        $query = '?key=' . urlencode(json_encode($token)) . '&include_docs=true&limit=1';

        $ch = curl_init($viewUrl . $query);
        $curlOptions = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 10,
        ];

        if ($couchUser && $couchPassword !== null && $couchPassword !== false) {
            $curlOptions[CURLOPT_USERPWD] = $couchUser . ':' . $couchPassword;
            $curlOptions[CURLOPT_HTTPAUTH] = CURLAUTH_BASIC;
        }

        curl_setopt_array($ch, $curlOptions);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            error_log('CouchDB session lookup failed: ' . $curlError);
            return null;
        }

        if ($httpCode !== 200) {
            error_log('CouchDB responded with HTTP ' . $httpCode . ' during session lookup');
            return null;
        }

        $payload = json_decode($response, true);
        if (!is_array($payload) || empty($payload['rows'])) {
            return null;
        }

        $row = $payload['rows'][0];
        $doc = $row['doc'] ?? null;
        if (!is_array($doc)) {
            return null;
        }

        $sessionMap = $doc['session'] ?? [];
        if (!is_array($sessionMap) || !isset($sessionMap[$token]) || !is_array($sessionMap[$token])) {
            return null;
        }

        $sessionInfo = $sessionMap[$token];
        if (isset($sessionInfo['expires'])) {
            $expiresTs = is_numeric($sessionInfo['expires']) ? (int)$sessionInfo['expires'] : strtotime((string)$sessionInfo['expires']);
            if ($expiresTs && $expiresTs < time()) {
                return null;
            }
        }

        $result = [
            'user_id' => $doc['key'] ?? $doc['name'] ?? ($doc['username'] ?? null),
            'roles' => isset($doc['roles']) && is_array($doc['roles']) ? $doc['roles'] : [],
            'expires' => $sessionInfo['expires'] ?? null,
            'provider' => $sessionInfo['provider'] ?? null
        ];

        if (isset($doc['profile'])) {
            $result['profile'] = $doc['profile'];
        }

        return $result;
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
