package com.ecopulse.backend.service.crypto;

public final class CryptoServiceLocator {
    private static volatile CryptoService INSTANCE;

    private CryptoServiceLocator() {}

    static void set(CryptoService service) {
        INSTANCE = service;
    }

    public static CryptoService getRequired() {
        var service = INSTANCE;
        if (service == null) {
            throw new IllegalStateException("CryptoService not initialized");
        }
        return service;
    }
}
