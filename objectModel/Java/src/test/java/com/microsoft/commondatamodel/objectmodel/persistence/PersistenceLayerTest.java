package com.microsoft.commondatamodel.objectmodel.persistence;

import com.microsoft.commondatamodel.objectmodel.TestHelper;
import com.microsoft.commondatamodel.objectmodel.cdm.CdmCorpusDefinition;
import com.microsoft.commondatamodel.objectmodel.cdm.CdmManifestDefinition;
import com.microsoft.commondatamodel.objectmodel.storage.LocalAdapter;
import java.io.File;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import org.testng.AssertJUnit;
import org.testng.annotations.Test;

public class PersistenceLayerTest {
  private static String testsSubpath = new File("persistence", "persistencelayer").toString();

  @Test
  public void testInvalidJson() throws InterruptedException {
    String testInputPath = TestHelper.getInputFolderPath(testsSubpath, "testInvalidJson");

    CdmCorpusDefinition corpus = new CdmCorpusDefinition();
    corpus.getStorage().mount("local", new LocalAdapter(testInputPath));
    corpus.getStorage().setDefaultNamespace("local");

    CdmManifestDefinition invalidManifest = null;
    try {
      invalidManifest = corpus.<CdmManifestDefinition>fetchObjectAsync("local:/invalidManifest.manifest.cdm.json").get();
    } catch (Exception e) {
      AssertJUnit.fail("Error should not be thrown when input json is invalid.");
    }
    AssertJUnit.assertNull(invalidManifest);
  }

  /**
   * Test that a document is fetched and saved using the correct persistence class, regardless of the case sensitivity of the file name/extension.
   * @throws InterruptedException
   * @throws ExecutionException
   * @throws IOException
   */
  @Test
  public void testFetchingAndSavingDocumentsWithCaseInsensitiveCheck() throws InterruptedException, ExecutionException, IOException {
    String testName = "testFetchingAndSavingDocumentsWithCaseInsensitiveCheck";
    String testInputPath = TestHelper.getInputFolderPath(testsSubpath, testName);

    CdmCorpusDefinition corpus = new CdmCorpusDefinition();
    LocalAdapter localAdapter = new LocalAdapter(testInputPath);
    corpus.getStorage().mount("local", localAdapter);
    corpus.getStorage().unmount("cdm");
    corpus.getStorage().setDefaultNamespace("local");

    CdmManifestDefinition manifest = corpus.<CdmManifestDefinition>fetchObjectAsync("empty.manifest.cdm.json").get();
    CdmManifestDefinition manifestFromModelJson = corpus.<CdmManifestDefinition>fetchObjectAsync("model.json").get();

    // Swap out the adapter for a fake one so that we aren't actually saving files. 
    Map<String, String> allDocs = new LinkedHashMap<>();
    TestStorageAdapter testAdapter = new TestStorageAdapter(allDocs);
    corpus.getStorage().setAdapter("local", testAdapter);

    String newManifestName = "empty.MANIFEST.CDM.json";
    manifest.saveAsAsync(newManifestName, true).get();
    // Verify that manifest persistence was called by comparing the saved document to the original manifest.
    String serializedManifest = allDocs.get("/" + newManifestName);;
    String expectedOutputManifest = TestHelper.getExpectedOutputFileContent(testsSubpath, testName, manifest.getName());
    TestHelper.assertSameObjectWasSerialized(expectedOutputManifest, serializedManifest);

    String newManifestFromModelJsonName = "MODEL.json";
    manifestFromModelJson.saveAsAsync(newManifestFromModelJsonName, true).get();
    // Verify that model.json persistence was called by comparing the saved document to the original model.json.
    serializedManifest = allDocs.get("/" + newManifestFromModelJsonName);
    expectedOutputManifest = TestHelper.getExpectedOutputFileContent(testsSubpath, testName, manifestFromModelJson.getName());
    TestHelper.assertSameObjectWasSerialized(expectedOutputManifest, serializedManifest);
  }

  /**
   * Test that loading a model.json or odi.json that isn't named exactly as such fails to load.
   */
  @Test
  public void testLoadingInvalidModelJsonAndOdiJsonName() throws InterruptedException, ExecutionException {
    String testName = "testLoadingInvalidModelJsonAndOdiJsonName";
    String testInputPath = TestHelper.getInputFolderPath(testsSubpath, testName);

    CdmCorpusDefinition corpus = new CdmCorpusDefinition();
    corpus.getStorage().mount("local", new LocalAdapter(testInputPath));
    corpus.getStorage().setDefaultNamespace("local");

    // We are trying to load a file with an invalid name, so FetchObjectAsync() should just return null.
    CdmManifestDefinition invalidModelJson = corpus.<CdmManifestDefinition>fetchObjectAsync("test.model.json").get();
    AssertJUnit.assertNull(invalidModelJson);
  }
}
