// tslint:disable: typedef non-literal-fs-path
import * as fs from 'fs';
import { isArray, isDate, isObject, isString } from 'util';
import { CdmCorpusDefinition, cdmStatusLevel } from '../internal';
import { LocalAdapter, RemoteAdapter } from '../StorageAdapter';

enum testFolders {
    Input,
    ExpectedOutput,
    ActualOutput
}

export const testHelper = {
    testDataPath: '__test__/TestData',
    schemaDocumentsPath: '../CDM.SchemaDocuments',
    doesWriteTestDebuggingFiles: false,
    getInputFolderPath: (testSubpath: string, testName: string) =>
        getTestFolderPath(testSubpath, testName, testFolders.Input),
    getExpectedOutputFolderPath: (testSubpath: string, testName: string) =>
        getTestFolderPath(testSubpath, testName, testFolders.ExpectedOutput),
    getActualOutputFolderPath: (testSubpath: string, testName: string) =>
        getTestFolderPath(testSubpath, testName, testFolders.ActualOutput),
    getInputFileContent(testSubpath: string, testName: string, fileName: string) {
        const pathOfInputFolder = testHelper.getInputFolderPath(testSubpath, testName);

        const pathOfInputFile = `${pathOfInputFolder}/${fileName}`;
        expectFileSystemPathToExist(pathOfInputFile, `Was unable to find file ${pathOfInputFile}`);

        return fs.readFileSync(pathOfInputFile)
            .toString();
    },
    getExpectedOutputFileContent(testSubpath: string, testName: string, fileName: string) {
        const pathOfExpectedOutputFolder = testHelper.getExpectedOutputFolderPath(testSubpath, testName);

        const pathOfExpectedOutputFile = `${pathOfExpectedOutputFolder}/${fileName}`;
        expectFileSystemPathToExist(pathOfExpectedOutputFile, `Was unable to find file ${pathOfExpectedOutputFile}`);

        return fs.readFileSync(pathOfExpectedOutputFile)
            .toString();
    },
    writeActualOutputFileContent(testSubpath: string, testName: string, fileName: string, fileContent: string) {
        const pathOfActualOutputFolder = testHelper.getActualOutputFolderPath(testSubpath, testName);
        const pathOfActualOutputFile = `${pathOfActualOutputFolder}/${fileName}`;

        fs.writeFileSync(pathOfActualOutputFile, fileContent);
    },
    /**
     * Compares the content of two Typescript objects.
     * Lists are considered equal if they have the same elements, no matter the order.
     * @param expected The expected value 'actual' should be compared with
     * @param actual The actual value that is to be compared with 'expected'
     * @param logError Whether differences between objects should be logged to console or not.
     * @returns Whether the objects are equal.
     */
    // tslint:disable-next-line: no-any
    compareObjectsContent(expected: any, actual: any, logError: boolean = false): boolean {
        if (expected === actual) {
            return true;
        }
        if (!expected || !actual) {
            if (!expected && !actual) {

                return true;
            }
            if (logError) {
                // tslint:disable-next-line: no-console
                console.log('Objects do not match. Expected = ', expected, ' actual = ', actual);
            }

            return false;
        }
        if (isArray(expected) && isArray(actual)) {
            let foundValue: boolean;
            for (const elementInExpected of expected) {
                foundValue = actual.some((element) => testHelper.compareObjectsContent(elementInExpected, element));
                if (!foundValue) {
                    if (logError) {
                        // tslint:disable-next-line: no-console
                        console.log('Arrays do not match. Found list member in expected, but not in actual : ', elementInExpected);
                    }

                    return false;
                }
            }
            for (const elementInActual of actual) {
                foundValue = expected.some((element) => testHelper.compareObjectsContent(element, elementInActual));
                if (!foundValue) {
                    if (logError) {
                        // tslint:disable-next-line: no-console
                        console.log('Arrays do not match. Found list member in actual, but not in expected : ', elementInActual);
                    }

                    return false;
                }
            }

            return true;
        }
        if (isObject(expected) && isObject(actual)) {
            const keysInExpected = Object.keys(expected as object);
            const keysInActual = Object.keys(actual as object);
            const allKeys = new Set([...keysInExpected, ...keysInActual]);
            for (const key of allKeys) {
                if (!testHelper.compareObjectsContent((expected as object)[key], (actual as object)[key], logError)) {
                    if (logError) {
                        // tslint:disable-next-line: no-console
                        console.log('object content not equal for key = ', key,
                            ' expected[key] = ', (expected as object)[key], ' actual[key] = ', (actual as object)[key]);
                    }

                    return false;
                }
            }

            return true;
        }
        if (isDate(expected) || isDate(actual)) {
            // tslint:disable-next-line: no-unsafe-any
            return Date.parse(expected) === Date.parse(actual);
        }
        if (isString(expected) && isString(actual) &&
            !isNaN(Date.parse(expected)) && !isNaN(Date.parse(actual)) &&
            Date.parse(expected) > 0 && Date.parse(actual) > 0) {
            return Date.parse(expected) === Date.parse(actual);
        }
        if (logError) {
            // tslint:disable-next-line: no-console
            console.log('Found inequality. Expected = ', expected, ' Actual = ', actual);
        }

        return false;
    },
    assertSameObjectWasSerialized(expected: string, actual: string) {
        const deserializedExpected: string = JSON.parse(expected);
        const deserializedActual: string = JSON.parse(actual);

        expect(testHelper.compareObjectsContent(deserializedExpected, deserializedActual))
            .toBeTruthy();
    },
    /**
     * Asserts two strings representing file content are equal. It ignores differences in line ending.
     * @param expected String representing expected file content.
     * @param actual String representing actual file content.
     */
    assertFileContentEquality(expected: string, actual: string) {
        expected = expected.replace(/\r\n/g, '\n');
        actual = actual.replace(/\r\n/g, '\n');
        expect(expected)
            .toEqual(actual);
    },
    // tslint:disable-next-line: no-any
    assertObjectContentEquality(expected: any, actual: any): void {
        expect(testHelper.compareObjectsContent(expected, actual))
            .toBeTruthy();
    },

    createCorpusForTest(testsSubpath: string, testName: string): CdmCorpusDefinition {
        const pathOfInput: string = testHelper.getInputFolderPath(testsSubpath, testName);

        const localAdapter: LocalAdapter = new LocalAdapter(pathOfInput);
        const cdmCorpus = new CdmCorpusDefinition();
        cdmCorpus.storage.mount('local', localAdapter);
        cdmCorpus.storage.defaultNamespace = 'local';

        // Set empty callback to avoid breaking tests due too many errors in logs,
        // change the event callback to console or file status report if wanted.
        // tslint:disable-next-line: no-empty
        cdmCorpus.setEventCallback(() => { }, cdmStatusLevel.error);

        return cdmCorpus;
    },

    /**
     * Creates a corpus to be used by the tests.
     * @param testFilesRoot The root of the corpus files.
     */
    getLocalCorpus(testFilesRoot: string): CdmCorpusDefinition {
        const cdmCorpus: CdmCorpusDefinition = new CdmCorpusDefinition();
        cdmCorpus.storage.defaultNamespace = 'local';

        cdmCorpus.storage.mount('local', new LocalAdapter(testFilesRoot));

        // Unmounts the default cdm and mounts the resource adapter. This will
        // also implicitely test the resource adapter functionality.
        cdmCorpus.storage.unMount('cdm');

        const remoteAdapter: RemoteAdapter = new RemoteAdapter();
        remoteAdapter.hosts = new Map<string, string>([['contoso', 'http://contoso.com']]);

        cdmCorpus.storage.mount('remote', remoteAdapter);

        // Set empty callback to avoid breaking tests due too many errors in logs,
        // change the event callback to console or file status report if wanted.
        // tslint:disable-next-line: no-empty
        cdmCorpus.setEventCallback(() => { }, cdmStatusLevel.error);

        return cdmCorpus;
    }
};

function getTestFolderPath(testSubpath: string, testName: string, use: testFolders): string {
    let folderName: string;
    switch (use) {
        case testFolders.Input:
            folderName = 'Input';
            break;
        case testFolders.ExpectedOutput:
            folderName = 'ExpectedOutput';
            break;
        case testFolders.ActualOutput:
            folderName = 'ActualOutput';
            break;
        default:
            throw new Error('Invalid folder specified');
    }

    const testFolderPath: string = `${testHelper.testDataPath}/${testSubpath}/${testName}/${folderName}`;

    if (use === testFolders.ActualOutput && !fs.existsSync(testFolderPath)) {
        fs.mkdirSync(testFolderPath);
    }
    expectFileSystemPathToExist(testFolderPath, `Was unable to find direcotry ${testFolderPath}`);

    return testFolderPath;
}

function expectFileSystemPathToExist(path: string, errorMessage: string = ''): void {
    if (!fs.existsSync(path)) {
        expect(errorMessage)
            .toEqual(undefined);
    }
}

describe('testHelper', () => {
    it('CompareObjectsContent', () => {
        expect(testHelper.compareObjectsContent('abc', 'abc'))
            .toBeTruthy();
        expect(testHelper.compareObjectsContent('abc', 'def'))
            .toBeFalsy();
        expect(testHelper.compareObjectsContent('123', 123))
            .toBeFalsy();
        expect(testHelper.compareObjectsContent(123, 1243))
            .toBeFalsy();
        expect(testHelper.compareObjectsContent(123, 123))
            .toBeTruthy();
        expect(testHelper.compareObjectsContent(
            { a: 'Value of a', b: 'value of b', c: 0 },
            { a: 'Value of a', b: 'value of b', c: 0 }))
            .toBeTruthy();
        expect(testHelper.compareObjectsContent(
            { a: 'Value of a', b: 'value of b', c: 0 },
            { a: 'Value of a', b: 'value of b', c: 1 }))
            .toBeFalsy();
        expect(testHelper.compareObjectsContent(
            { a: 'Value of a', b: 'value of b', c: 0 },
            { a: 'Value of A', b: 'value of b', c: 0 }))
            .toBeFalsy();
        expect(testHelper.compareObjectsContent(
            { a: 'Value of a', b: 'value of b', c: 0 },
            { b: 'value of b', c: 0, a: 'Value of a' }))
            .toBeTruthy();
        expect(testHelper.compareObjectsContent(
            { a: 'Value of a', b: 'value of b', c: 0 },
            { a: 'Value of a', b: 'value of b', c: 0, list: [] }))
            .toBeFalsy();
        expect(testHelper.compareObjectsContent(
            { a: 'Value of a', b: 'value of b', c: 0, list: [1, 2, 3] },
            { a: 'Value of a', b: 'value of b', c: 0, list: [] }))
            .toBeFalsy();
        expect(testHelper.compareObjectsContent(
            { a: 'Value of a', b: 'value of b', c: 0, list: undefined },
            { a: 'Value of a', b: 'value of b', c: 0, list: [] }))
            .toBeFalsy();
        expect(testHelper.compareObjectsContent(
            { a: 'Value of a', b: 'value of b', c: 0, list: [1, 2, '3', 4] },
            { a: 'Value of a', b: 'value of b', c: 0, list: [1, 2, '3', 4] }))
            .toBeTruthy();
        expect(testHelper.compareObjectsContent(
            { a: 'Value of a', b: 'value of b', c: 0, list: [1, 2, 3, 4] },
            { a: 'Value of a', b: 'value of b', c: 0, list: [1, 2, '3', 4] }))
            .toBeFalsy();
        expect(testHelper.compareObjectsContent(
            { a: 'Value of a', b: 'value of b', c: 0, list: [1, 2, { d: 'D', e: 'E' }, 4, 5] },
            { a: 'Value of a', b: 'value of b', c: 0, list: [1, 2, { d: 'D', e: 'E' }, 4, 5] }))
            .toBeTruthy();
        expect(testHelper.compareObjectsContent(
            { a: 'Value of a', b: 'value of b', c: 0, list: [1, 2, { d: 'X', e: 'E' }, 4, 5] },
            { a: 'Value of a', b: 'value of b', c: 0, list: [1, 2, { d: 'D', e: 'E' }, 4, 5] }))
            .toBeFalsy();
        expect(testHelper.compareObjectsContent(
            { b: 'value of b', list: [5, { d: 'D', e: 'E' }, 2, 4, 1], a: 'Value of a', c: 0 },
            { a: 'Value of a', b: 'value of b', c: 0, list: [1, 2, { d: 'D', e: 'E' }, 4, 5] }))
            .toBeTruthy();

        // Date Time comparison
        expect(testHelper.compareObjectsContent(
            { date: '2019-05-19T23:36:00+00:00' },
            { date: '2019-05-19T23:36:00.000Z' }))
            .toBeTruthy();
    });

    it('AssertFileContentEquality', () => {
        testHelper.assertFileContentEquality(
            'abc\r\ndef\r\nghi\r\njkl\nmno',
            'abc\ndef\nghi\njkl\nmno'
        );
    });
    it('AssertFileContentEquality - fails for inequality', () => {
        let expectFailed: boolean;
        try {
            testHelper.assertFileContentEquality(
                'abc\ndef\nghij',
                'abc\ndef\nghi'
            );
            expectFailed = false;
        } catch (ex) {
            expectFailed = true;
        }
        expect(expectFailed)
            .toBeTruthy();
    });
    it('WriteTestDebuggingFiles', () => {
        expect(testHelper.doesWriteTestDebuggingFiles)
            .toBeFalsy();
    });
});
