import {beforeEach, describe, expect, jest, test} from '@jest/globals';

const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
    };
})();
Object.defineProperty(global, 'localStorage', {value: localStorageMock});

describe('_certAccordingToValidity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    const certObject = {
        certificateChain: ['U29tZSB2YWxpZCBkYXRh'],
    };
    const expiresIn2Day = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const expiresIn9Day = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
    const expiresIn30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const alreadyExpired = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    test('Certificate expires in 9 days, VALID', async () => {
        jest.unstable_mockModule('pkijs', () => ({
            Certificate: jest.fn().mockImplementation(({schema} = {}) => ({
                notAfter: {value: expiresIn9Day},
            })),
        }));
        const {_certAccordingToValidity} = await import('../common/services/certificate.js');
        const result = await _certAccordingToValidity(certObject);
        expect(result).toBe(certObject);
    });

    test('Certificate expires in 30 days, VALID', async () => {
        jest.unstable_mockModule('pkijs', () => ({
            Certificate: jest.fn().mockImplementation(({schema} = {}) => ({
                notAfter: {value: expiresIn30Days},
            })),
        }));
        const {_certAccordingToValidity} = await import('../common/services/certificate.js');
        const result = await _certAccordingToValidity(certObject);
        expect(result).toBe(certObject);
    });

    test('Certificate expires in 2 days, INVALID', async () => {
        jest.unstable_mockModule('pkijs', () => ({
            Certificate: jest.fn().mockImplementation(({schema} = {}) => ({
                notAfter: {value: expiresIn2Day},
            })),
        }));
        const {_certAccordingToValidity} = await import('../common/services/certificate.js');
        const result = await _certAccordingToValidity(certObject);
        expect(result).toBe(null);
    });

    test('Certificate already expired, INVALID', async () => {
        jest.unstable_mockModule('pkijs', () => ({
            Certificate: jest.fn().mockImplementation(({schema} = {}) => ({
                notAfter: {value: alreadyExpired},
            })),
        }));
        const {_certAccordingToValidity} = await import('../common/services/certificate.js');
        const result = await _certAccordingToValidity(certObject);
        expect(result).toBe(null);
    });
});