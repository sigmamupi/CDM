import {
    ArgumentValue,
    AttributeResolutionDirectiveSet,
    CdmArgumentDefinition,
    CdmAttribute,
    CdmAttributeContext,
    CdmAttributeContextReference,
    cdmAttributeContextType,
    CdmAttributeGroupDefinition,
    CdmAttributeGroupReference,
    CdmAttributeReference,
    CdmAttributeResolutionGuidance,
    CdmConstantEntityDefinition,
    CdmContainerDefinition,
    CdmCorpusContext,
    CdmDataPartitionDefinition,
    CdmDataPartitionPatternDefinition,
    CdmDataTypeDefinition,
    CdmDataTypeReference,
    CdmDocumentDefinition,
    CdmE2ERelationship,
    CdmEntityAttributeDefinition,
    CdmEntityDefinition,
    CdmEntityReference,
    CdmFolderDefinition,
    CdmImport,
    CdmLocalEntityDeclarationDefinition,
    CdmManifestDeclarationDefinition,
    CdmManifestDefinition,
    CdmObject,
    CdmObjectBase,
    CdmObjectDefinition,
    CdmObjectDefinitionBase,
    CdmObjectReference,
    CdmObjectReferenceBase,
    cdmObjectType,
    CdmParameterDefinition,
    CdmPurposeDefinition,
    CdmPurposeReference,
    CdmReferencedEntityDeclarationDefinition,
    cdmStatusLevel,
    CdmTraitDefinition,
    CdmTraitReference,
    CdmTypeAttributeDefinition,
    cdmValidationStep,
    copyOptions,
    docsResult,
    EventCallback,
    ICdmProfiler,
    Logger,
    p,
    ParameterCollection,
    resolveContext,
    ResolvedTrait,
    ResolvedTraitSet,
    resolveOptions,
    StorageAdapter,
    StorageManager,
    SymbolSet
} from '../internal';
import { cdmFolder, modelJson } from '../Persistence';
import {
    isAttributeGroupDefinition,
    isCdmTraitDefinition,
    isDataTypeDefinition,
    isEntityDefinition,
    isParameterDefinition,
    isPurposeDefinition
} from '../Utilities/cdmObjectTypeGuards';
import { VisitCallback } from '../Utilities/VisitCallback';

export class CdmCorpusDefinition {
    public get profiler(): ICdmProfiler {
        return p;
    }
    /**
     * @internal
     */
    // tslint:disable-next-line:variable-name
    public static _nextID: number = 0;
    public appId: string;
    public isCurrentlyResolving: boolean = false;
    public blockDeclaredPathChanges: boolean = false;
    public rootPath: string;
    /**
     * @internal
     */
    public allDocuments: [CdmFolderDefinition, CdmDocumentDefinition][];
    public readonly storage: StorageManager;

    /**
     * Gets the object context.
     */
    public readonly ctx: CdmCorpusContext;
    /**
     * @internal
     */
    public directory: Map<CdmDocumentDefinition, CdmFolderDefinition>;
    /**
     * @internal
     */
    public definitionReferenceSymbols: Map<string, SymbolSet>;
    /**
     * @internal
     */
    public rootManifest: CdmManifestDefinition;
    /**
     * @internal
     */
    public objectCache: Map<string, CdmObject>;

    /**
     * @internal
     */
    public docsNotLoaded: Set<string>;
    /**
     * @internal
     */
    public docsCurrentlyLoading: Set<string>;
    /**
     * @internal
     */
    public docsNotIndexed: Set<CdmDocumentDefinition>;
    /**
     * @internal
     */
    public docsNotFound: Set<string>;

    /**
     * @internal
     */
    public readonly symbol2EntityDefList: Map<string, CdmEntityDefinition[]>;
    private readonly pathLookup: Map<string, [CdmFolderDefinition, CdmDocumentDefinition]>;
    private readonly symbolDefinitions: Map<string, CdmDocumentDefinition[]>;
    private readonly defintionWrtTag: Map<string, string>;
    private readonly emptyRTS: Map<string, ResolvedTraitSet>;
    private readonly namespaceFolders: Map<string, CdmFolderDefinition>;

    private readonly outgoingRelationships: Map<CdmEntityDefinition, CdmE2ERelationship[]>;
    private readonly incomingRelationships: Map<CdmEntityDefinition, CdmE2ERelationship[]>;

    private readonly cdmExtension: string = 'cdm.json';

    constructor() {
        // let bodyCode = () =>
        {
            // this.rootPath = rootPath;
            this.namespaceFolders = new Map<string, CdmFolderDefinition>();
            this.allDocuments = [];
            this.pathLookup = new Map<string, [CdmFolderDefinition, CdmDocumentDefinition]>();
            this.directory = new Map<CdmDocumentDefinition, CdmFolderDefinition>();
            this.symbolDefinitions = new Map<string, CdmDocumentDefinition[]>();
            this.definitionReferenceSymbols = new Map<string, SymbolSet>();
            this.defintionWrtTag = new Map<string, string>();
            this.emptyRTS = new Map<string, ResolvedTraitSet>();
            this.outgoingRelationships = new Map<CdmEntityDefinition, CdmE2ERelationship[]>();
            this.incomingRelationships = new Map<CdmEntityDefinition, CdmE2ERelationship[]>();
            this.symbol2EntityDefList = new Map<string, CdmEntityDefinition[]>();
            this.objectCache = new Map<string, CdmObject>();

            this.ctx = new resolveContext(this);
            this.storage = new StorageManager(this);

            this.docsNotLoaded = new Set<string>();
            this.docsCurrentlyLoading = new Set<string>();
            this.docsNotFound = new Set<string>();
            this.docsNotIndexed = new Set<CdmDocumentDefinition>();
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public static nextID(): number {
        this._nextID++;

        return this._nextID;
    }

    /**
     * @internal
     */
    public static fetchFolioExtension(): string {
        return '.folio.cdm.json';
    }

    /**
     * @internal
     */
    public static fetchManifestExtension(): string {
        return '.manifest.cdm.json';
    }

    /**
     * @internal
     */
    public static fetchModelJsonExtension(): string {
        return 'model.json';
    }

    /**
     * @internal
     */
    public static mapReferenceType(ofType: cdmObjectType): cdmObjectType {
        // let bodyCode = () =>
        {
            switch (ofType) {
                case cdmObjectType.argumentDef:
                case cdmObjectType.documentDef:
                case cdmObjectType.manifestDef:
                case cdmObjectType.import:
                case cdmObjectType.parameterDef:
                default:
                    return cdmObjectType.error;

                case cdmObjectType.attributeGroupRef:
                case cdmObjectType.attributeGroupDef:
                    return cdmObjectType.attributeGroupRef;

                case cdmObjectType.constantEntityDef:
                case cdmObjectType.entityDef:
                case cdmObjectType.entityRef:
                    return cdmObjectType.entityRef;

                case cdmObjectType.dataTypeDef:
                case cdmObjectType.dataTypeRef:
                    return cdmObjectType.dataTypeRef;

                case cdmObjectType.purposeDef:
                case cdmObjectType.purposeRef:
                    return cdmObjectType.purposeRef;

                case cdmObjectType.traitDef:
                case cdmObjectType.traitRef:
                    return cdmObjectType.traitRef;

                case cdmObjectType.entityAttributeDef:
                case cdmObjectType.typeAttributeDef:
                case cdmObjectType.attributeRef:
                    return cdmObjectType.attributeRef;

                case cdmObjectType.attributeContextDef:
                case cdmObjectType.attributeContextRef:
                    return cdmObjectType.attributeContextRef;
            }
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public static createCacheKeyFromObject(definition: CdmObject, kind: string): string {
        return `${definition.ID}-${kind}`;
    }

    /**
     * @internal
     */
    private static fetchPriorityDoc(
        docs: CdmDocumentDefinition[],
        importPriority: Map<CdmDocumentDefinition,
            number>): CdmDocumentDefinition {
        // let bodyCode = () =>
        {
            let docBest: CdmDocumentDefinition;
            let indexBest: number = Number.MAX_SAFE_INTEGER;
            for (const docDefined of docs) {
                // is this one of the imported docs?
                const indexFound: number = importPriority.get(docDefined);
                if (indexFound < indexBest) {
                    indexBest = indexFound;
                    docBest = docDefined;
                    if (indexBest === 0) {
                        break;
                    } // hard to be better than the best
                }
            }

            return docBest;
        }
        // return p.measure(bodyCode);
    }

    public async createRootManifest(corpusPath: string): Promise<CdmManifestDefinition> {
        if (this.isPathManifestDocument(corpusPath)) {
            this.rootManifest = await this._fetchObjectAsync(corpusPath, undefined, false) as CdmManifestDefinition;

            return this.rootManifest;
        }
    }

    /**
     * @internal
     */
    public createEmptyResolvedTraitSet(resOpt: resolveOptions): ResolvedTraitSet {
        // let bodyCode = () =>
        {
            let key: string = '';
            if (resOpt) {
                if (resOpt.wrtDoc) {
                    key = resOpt.wrtDoc.ID.toString();
                }
                key += '-';
                if (resOpt.directives) {
                    key += resOpt.directives.getTag();
                }
            }
            let rts: ResolvedTraitSet = this.emptyRTS.get(key);
            if (!rts) {
                rts = new ResolvedTraitSet(resOpt);
                this.emptyRTS.set(key, rts);
            }

            return rts;
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public docsForSymbol(
        resOpt: resolveOptions,
        wrtDoc: CdmDocumentDefinition,
        fromDoc: CdmDocumentDefinition,
        symbolDef: string): docsResult {
        // let bodyCode = () =>
        {
            const ctx: resolveContext = this.ctx as resolveContext;
            const result: docsResult = { newSymbol: symbolDef };

            // first decision, is the symbol defined anywhere?
            result.docList = this.symbolDefinitions.get(symbolDef);
            if (!result.docList || result.docList.length === 0) {
                // this can happen when the symbol is disambiguated with a moniker for one of the imports used
                // in this situation, the 'wrt' needs to be ignored,
                // the document where the reference is being made has a map of the 'one best' monikered import to search for each moniker
                const preEnd: number = symbolDef.indexOf('/');
                if (preEnd === 0) {
                    // absolute refererence
                    Logger.error(
                        CdmCorpusDefinition.name,
                        ctx,
                        `no support for absolute references yet. fix '${symbolDef}'`, ctx.relativePath
                    );

                    return undefined;
                }
                if (preEnd > 0) {
                    const prefix: string = symbolDef.slice(0, preEnd);
                    result.newSymbol = symbolDef.slice(preEnd + 1);
                    result.docList = this.symbolDefinitions.get(result.newSymbol);
                    if (fromDoc && fromDoc.importPriorities && fromDoc.importPriorities.monikerPriorityMap.has(prefix)) {
                        const tempMonikerDoc: CdmDocumentDefinition = fromDoc.importPriorities.monikerPriorityMap.get(prefix);
                        // if more monikers, keep looking
                        if (result.newSymbol.indexOf('/') >= 0 && !this.symbolDefinitions.has(result.newSymbol)) {
                            return this.docsForSymbol(resOpt, wrtDoc, tempMonikerDoc, result.newSymbol);
                        }
                        resOpt.fromMoniker = prefix;
                        result.docBest = tempMonikerDoc;
                    } else if (wrtDoc.importPriorities && wrtDoc.importPriorities.monikerPriorityMap.has(prefix)) {
                        // if that didn't work, then see if the wrtDoc can find the moniker
                        const tempMonikerDoc: CdmDocumentDefinition = wrtDoc.importPriorities.monikerPriorityMap.get(prefix);
                        // if more monikers, keep looking
                        if (result.newSymbol.indexOf('/') >= 0) {
                            return this.docsForSymbol(resOpt, wrtDoc, tempMonikerDoc, result.newSymbol);
                        }
                        resOpt.fromMoniker = prefix;
                        result.docBest = tempMonikerDoc;
                    } else {
                        // moniker not recognized in either doc, fail with grace
                        result.newSymbol = symbolDef;
                        result.docList = undefined;
                    }
                }
            }

            return result;
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public resolveSymbolReference(
        resOpt: resolveOptions,
        fromDoc: CdmDocumentDefinition,
        symbolDef: string,
        expectedType: cdmObjectType,
        retry: boolean
    ): CdmObjectDefinitionBase {
        // let bodyCode = () =>
        {
            // given a symbolic name,
            // find the 'highest prirority' definition of the object from the point of view of a given document (with respect to, wrtDoc)
            // (meaning given a document and the things it defines and the files it imports and the files they import,
            // where is the 'last' definition found)
            if (!resOpt || !resOpt.wrtDoc) {
                return undefined;
            } // no way to figure this out
            const wrtDoc: CdmDocumentDefinition = resOpt.wrtDoc;

            // get the array of documents where the symbol is defined
            const symbolDocsResult: docsResult = this.docsForSymbol(resOpt, wrtDoc, fromDoc, symbolDef);
            let docBest: CdmDocumentDefinition = symbolDocsResult.docBest;
            symbolDef = symbolDocsResult.newSymbol;
            const docs: CdmDocumentDefinition[] = symbolDocsResult.docList;
            if (docs) {
                // add this symbol to the set being collected in resOpt, we will need this when caching
                if (!resOpt.symbolRefSet) {
                    resOpt.symbolRefSet = new SymbolSet();
                }
                resOpt.symbolRefSet.add(symbolDef);
                // for the given doc, there is a sorted list of imported docs (including the doc itself as item 0).
                // find the lowest number imported document that has a definition for this symbol
                if (!wrtDoc.importPriorities) {
                    return undefined; // need to index imports first, should have happened
                }
                const importPriority: Map<CdmDocumentDefinition, number> = wrtDoc.importPriorities.importPriority;
                if (importPriority.size === 0) {
                    return undefined;
                }

                if (!docBest) {
                    docBest = CdmCorpusDefinition.fetchPriorityDoc(docs, importPriority) || docBest;
                }
            }

            // perhaps we have never heard of this symbol in the imports for this document?
            if (!docBest) {
                return undefined;
            }

            // return the definition found in the best document
            let found: CdmObjectDefinitionBase = docBest.internalDeclarations.get(symbolDef);
            if (found === undefined && retry === true) {
                // maybe just locatable from here not defined here
                found = this.resolveSymbolReference(resOpt, docBest, symbolDef, expectedType, false);
            }

            if (found && expectedType !== cdmObjectType.error) {
                found = this.reportErrorStatus(found, symbolDef, expectedType);
            }

            return found;
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public registerDefinitionReferenceSymbols(definition: CdmObject, kind: string, symbolRefSet: SymbolSet): void {
        // let bodyCode = () =>
        {
            const key: string = CdmCorpusDefinition.createCacheKeyFromObject(definition, kind);
            const existingSymbols: SymbolSet = this.definitionReferenceSymbols.get(key);
            if (existingSymbols === undefined) {
                // nothing set, just use it
                this.definitionReferenceSymbols.set(key, symbolRefSet);
            } else {
                // something there, need to merge
                existingSymbols.merge(symbolRefSet);
            }
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public unRegisterDefinitionReferenceDocuments(definition: CdmObject, kind: string): void {
        // let bodyCode = () =>
        {
            const key: string = CdmCorpusDefinition.createCacheKeyFromObject(definition, kind);
            this.definitionReferenceSymbols.delete(key);
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public createDefinitionCacheTag(
        resOpt: resolveOptions,
        definition: CdmObjectBase,
        kind: string,
        extraTags: string = '',
        useNameNotId: boolean = false
    ): string {
        // let bodyCode = () =>
        {
            // construct a tag that is unique for a given object in a given context
            // context is:
            //   (1) the wrtDoc has a set of imports and defintions that may change what the object is point at
            //   (2) there are different kinds of things stored per object (resolved traits, atts, etc.)
            //   (3) the directives from the resolve Options might matter
            //   (4) sometimes the caller needs different caches (extraTags) even give 1-3 are the same
            // the hardest part is (1). To do this, see if the object has a set of reference documents registered.
            // if there is nothing registered, there is only one possible way to resolve the object so don't include doc info in the tag.
            // if there IS something registered, then the object could be ambiguous.
            // find the 'index' of each of the ref documents (potential definition of something referenced under this scope)
            // in the wrt document's list of imports. sort the ref docs by their index,
            // the relative ordering of found documents makes a unique context.
            // the hope is that many, many different lists of imported files will result in identical reference sortings, so lots of re-use
            // since this is an expensive operation, actually cache the sorted list associated with this object and wrtDoc

            // easy stuff first
            let thisId: string;
            const thisName: string = definition.fetchObjectDefinitionName();
            if (useNameNotId) {
                thisId = thisName;
            } else {
                thisId = definition.ID.toString();
            }

            let tagSuffix: string = `-${kind}-${thisId}`;
            tagSuffix += `-(${resOpt.directives ? resOpt.directives.getTag() : ''})`;
            if (extraTags) {
                tagSuffix += `-${extraTags}`;
            }

            // is there a registered set?
            // (for the objectdef, not for a reference) of the many symbols involved in defining this thing(might be none)
            const objDef: CdmObjectDefinition = definition.fetchObjectDefinition(resOpt);
            let symbolsRef: SymbolSet;
            if (objDef) {
                const key: string = CdmCorpusDefinition.createCacheKeyFromObject(objDef, kind);
                symbolsRef = this.definitionReferenceSymbols.get(key);
            }

            if (symbolsRef === undefined && thisName !== undefined) {
                // every symbol should depend on at least itself
                const symSetThis: SymbolSet = new SymbolSet();
                symSetThis.add(thisName);
                this.registerDefinitionReferenceSymbols(definition, kind, symSetThis);
                symbolsRef = symSetThis;
            }

            if (symbolsRef && symbolsRef.size > 0) {
                // each symbol may have definitions in many documents. use importPriority to figure out which one we want
                const wrtDoc: CdmDocumentDefinition = resOpt.wrtDoc;
                const foundDocIds: Set<number> = new Set<number>();
                if (wrtDoc.importPriorities) {
                    for (const symRef of symbolsRef) {
                        // get the set of docs where defined
                        const docsRes: docsResult = this.docsForSymbol(resOpt, wrtDoc, definition.inDocument, symRef);
                        // we only add the best doc if there are multiple options
                        if (docsRes !== undefined && docsRes.docList !== undefined && docsRes.docList.length > 1) {
                            const docBest: CdmDocumentDefinition = CdmCorpusDefinition.fetchPriorityDoc(
                                docsRes.docList,
                                wrtDoc.importPriorities.importPriority
                            );
                            if (docBest) {
                                foundDocIds.add(docBest.ID);
                            }
                        }
                    }
                }
                const tagPre: string = Array.from(foundDocIds)
                    .sort()
                    .join('-');

                return tagPre + tagSuffix;
            }
        }
        // return p.measure(bodyCode);
    }

    public MakeRef<T extends CdmObjectReference>(ofType: cdmObjectType, refObj: string | CdmObjectDefinition, simpleNameRef: boolean): T {
        // let bodyCode = () =>
        {
            let oRef: CdmObjectReference;

            if (refObj) {
                if (refObj instanceof CdmObjectBase) {
                    if (refObj.objectType === ofType) {
                        // forgive this mistake, return the ref passed in
                        oRef = (refObj as CdmObject) as CdmObjectReference;
                    } else {
                        oRef = this.MakeObject<CdmObjectReference>(ofType, undefined, false);
                        oRef.explicitReference = refObj as CdmObjectDefinition;
                    }
                } else {
                    // refObj is a string or object
                    oRef = this.MakeObject<CdmObjectReference>(ofType, refObj as string, simpleNameRef);
                }
            }

            return oRef as T;
        }
        // return p.measure(bodyCode);
    }

    public MakeObject<T extends CdmObject>(ofType: cdmObjectType, nameOrRef?: string, simmpleNameRef?: boolean): T {
        // let bodyCode = () =>
        {
            let newObj: CdmObject;

            switch (ofType) {
                case cdmObjectType.argumentDef:
                    newObj = new CdmArgumentDefinition(this.ctx, nameOrRef);
                    (newObj as CdmArgumentDefinition).name = nameOrRef;
                    break;
                case cdmObjectType.attributeGroupDef:
                    newObj = new CdmAttributeGroupDefinition(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.attributeGroupRef:
                    newObj = new CdmAttributeGroupReference(this.ctx, nameOrRef, simmpleNameRef);
                    break;
                case cdmObjectType.constantEntityDef:
                    newObj = new CdmConstantEntityDefinition(this.ctx);
                    (newObj as CdmConstantEntityDefinition).constantEntityName = nameOrRef;
                    break;
                case cdmObjectType.dataTypeDef:
                    newObj = new CdmDataTypeDefinition(this.ctx, nameOrRef, undefined);
                    break;
                case cdmObjectType.dataTypeRef:
                    newObj = new CdmDataTypeReference(this.ctx, nameOrRef, simmpleNameRef);
                    break;
                case cdmObjectType.documentDef:
                    newObj = new CdmDocumentDefinition(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.manifestDef:
                    newObj = new CdmManifestDefinition(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.entityAttributeDef:
                    newObj = new CdmEntityAttributeDefinition(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.entityDef:
                    newObj = new CdmEntityDefinition(this.ctx, nameOrRef, undefined);
                    break;
                case cdmObjectType.entityRef:
                    newObj = new CdmEntityReference(this.ctx, nameOrRef, simmpleNameRef);
                    break;
                case cdmObjectType.import:
                    newObj = new CdmImport(this.ctx, nameOrRef, undefined);
                    break;
                case cdmObjectType.parameterDef:
                    newObj = new CdmParameterDefinition(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.purposeDef:
                    newObj = new CdmPurposeDefinition(this.ctx, nameOrRef, undefined);
                    break;
                case cdmObjectType.purposeRef:
                    newObj = new CdmPurposeReference(this.ctx, nameOrRef, simmpleNameRef);
                    break;
                case cdmObjectType.traitDef:
                    newObj = new CdmTraitDefinition(this.ctx, nameOrRef, undefined);
                    break;
                case cdmObjectType.traitRef:
                    newObj = new CdmTraitReference(this.ctx, nameOrRef, simmpleNameRef, false);
                    break;
                case cdmObjectType.typeAttributeDef:
                    newObj = new CdmTypeAttributeDefinition(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.attributeContextDef:
                    newObj = new CdmAttributeContext(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.attributeContextRef:
                    newObj = new CdmAttributeContextReference(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.attributeRef:
                    newObj = new CdmAttributeReference(this.ctx, nameOrRef, simmpleNameRef);
                    break;
                case cdmObjectType.dataPartitionDef:
                    newObj = new CdmDataPartitionDefinition(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.dataPartitionPatternDef:
                    newObj = new CdmDataPartitionPatternDefinition(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.manifestDeclarationDef:
                    newObj = new CdmManifestDeclarationDefinition(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.referencedEntityDeclarationDef:
                    newObj = new CdmReferencedEntityDeclarationDefinition(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.localEntityDeclarationDef:
                    newObj = new CdmLocalEntityDeclarationDefinition(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.folderDef:
                    newObj = new CdmFolderDefinition(this.ctx, nameOrRef);
                    break;
                case cdmObjectType.attributeResolutionGuidanceDef:
                    newObj = new CdmAttributeResolutionGuidance(this.ctx);
                    break;
                case cdmObjectType.e2eRelationshipDef:
                    newObj = new CdmE2ERelationship(this.ctx, nameOrRef);
                    break;
                default:
            }

            return newObj as T;
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public addDocumentObjects(folder: CdmFolderDefinition, docDef: CdmDocumentDefinition): CdmDocumentDefinition {
        // let bodyCode = () =>
        {
            const doc: CdmDocumentDefinition = docDef;
            const path: string = this.storage.createAbsoluteCorpusPath(`${doc.folderPath}${doc.name}`, doc)
                .toLowerCase();
            if (!this.pathLookup.has(path)) {
                this.allDocuments.push([folder, doc]);
                this.pathLookup.set(path, [folder, doc]);
                this.directory.set(doc, folder);
            }

            return doc;
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public removeDocumentObjects(folder: CdmFolderDefinition, docDef: CdmDocumentDefinition): void {
        // let bodyCode = () =>
        {
            const doc: CdmDocumentDefinition = docDef;
            // don't worry about defintionWrtTag because it uses the doc ID
            // that won't get re-used in this session unless there are more than 4 billion objects
            // every symbol defined in this document is pointing at the document, so remove from cache.
            // also remove the list of docs that it depends on
            this.removeObjectDefinitions(doc);

            // remove from path lookup, folder lookup and global list of documents
            const path: string = this.storage.createAbsoluteCorpusPath(`${doc.folderPath}${doc.name}`, doc)
                .toLowerCase();
            if (this.pathLookup.has(path)) {
                this.pathLookup.delete(path);
                this.directory.delete(doc);
                const index: number = this.allDocuments.indexOf([folder, doc]);
                this.allDocuments.splice(index, 1);
            }
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public listMissingImports(): Set<string> {
        // let bodyCode = () =>
        {
            for (const fs of this.allDocuments) {
                this.findMissingImportsFromDocument(fs['1']);
            }

            if (this.docsNotLoaded.size === 0) {
                return undefined;
            }

            return this.docsNotLoaded;
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public indexDocuments(resOpt: resolveOptions): boolean {
        // let bodyCode = () =>
        {
            if (this.docsNotIndexed.size > 0) {
                // index any imports
                for (const doc of this.docsNotIndexed) {
                    if (doc.needsIndexing) {
                        doc.clearCaches();
                        doc.getImportPriorities();
                    }
                }
                // check basic integrity
                for (const doc of this.docsNotIndexed) {
                    if (doc.needsIndexing) {
                        if (!this.checkObjectIntegrity(doc)) {
                            return false;
                        }
                    }
                }
                // declare definitions of objects in this doc
                for (const doc of this.docsNotIndexed) {
                    if (doc.needsIndexing) {
                        this.declareObjectDefinitions(doc, '');
                    }
                }
                // make sure we can find everything that is named by reference
                for (const doc of this.docsNotIndexed) {
                    if (doc.needsIndexing) {
                        const resOptLocal: resolveOptions = CdmObjectBase.copyResolveOptions(resOpt);
                        resOptLocal.wrtDoc = doc;
                        this.resolveObjectDefinitions(resOptLocal, doc);
                    }
                }
                // now resolve any trait arguments that are type object
                for (const doc of this.docsNotIndexed) {
                    if (doc.needsIndexing) {
                        const resOptLocal: resolveOptions = CdmObjectBase.copyResolveOptions(resOpt);
                        resOptLocal.wrtDoc = doc;
                        this.resolveTraitArguments(resOptLocal, doc);
                    }
                }
                // finish up
                for (const doc of this.docsNotIndexed) {
                    if (doc.needsIndexing) {
                        this.finishDocumentResolve(doc);
                    }
                }
                // return p.measure(bodyCode);
            }

            return true;
        }
    }

    public visit(path: string, preChildren: VisitCallback, postChildren: VisitCallback): boolean {
        return false;
    }

    public async loadFolderOrDocument(objectPath: string, forceReload: boolean = false): Promise<CdmContainerDefinition> {
        // let bodyCode = () =>
        {
            if (objectPath) {
                // first check for namespace
                const pathTuple: [string, string] = this.storage.splitNamespacePath(objectPath);
                const namespace: string = pathTuple[0] || this.storage.defaultNamespace;
                objectPath = pathTuple[1];

                if (objectPath.indexOf('/') === 0) {
                    const namespaceFolder: CdmFolderDefinition = this.storage.fetchRootFolder(namespace);
                    const namespaceAdapter: StorageAdapter = this.storage.fetchAdapter(namespace);
                    if (!namespaceFolder || !namespaceAdapter) {
                        Logger.error(
                            CdmCorpusDefinition.name,
                            this.ctx,
                            `The namespace '${namespace}' has not been registered`,
                            `loadFolderOrDocument(${objectPath})`
                        );

                        return;
                    }
                    const lastFolder: CdmFolderDefinition = await namespaceFolder.fetchChildFolderFromPathAsync(objectPath, false);

                    // don't create new folders, just go as far as possible
                    if (lastFolder) {
                        // maybe the search is for a folder?
                        const lastPath: string = lastFolder.folderPath;
                        if (lastPath === objectPath) {
                            return lastFolder;
                        }

                        // remove path to folder and then look in the folder
                        objectPath = objectPath.slice(lastPath.length);

                        return lastFolder.fetchDocumentFromFolderPathAsync(objectPath, namespaceAdapter, forceReload);
                    }
                }
            }

            return undefined;
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public async _fetchObjectAsync(objectPath: string, obj: CdmObject, forceReload: boolean = false): Promise<CdmObject> {
        objectPath = this.storage.createAbsoluteCorpusPath(objectPath, obj);

        let documentPath: string = objectPath;
        let documentNameIndex: number = objectPath.lastIndexOf(this.cdmExtension);

        if (documentNameIndex !== -1) {
            // if there is something after the document path, split it into document path and object path.
            documentNameIndex += this.cdmExtension.length;
            documentPath = objectPath.slice(0, documentNameIndex);
        }

        const newObj: CdmContainerDefinition = await this.loadFolderOrDocument(documentPath, forceReload);

        if (newObj) {
            // get imports and index each document that is loaded
            if (newObj instanceof CdmDocumentDefinition) {
                const resOpt: resolveOptions = {
                    wrtDoc: newObj,
                    directives: new AttributeResolutionDirectiveSet()
                };
                if (!await newObj.indexIfNeeded(resOpt)) {
                    return undefined;
                }
            }

            if (documentPath === objectPath) {
                return newObj;
            }

            if (documentNameIndex === -1) {
                // there is no remaining path to be loaded, so return.
                return;
            }

            // trim off the document path to get the object path in the doc
            const remainingObjectPath: string = objectPath.slice(documentNameIndex + 1);

            const result: CdmObject = (newObj as CdmDocumentDefinition).fetchObjectFromDocumentPath(remainingObjectPath);
            if (result === undefined) {
                Logger.error(
                    CdmCorpusDefinition.name,
                    this.ctx,
                    `Could not find symbol '${remainingObjectPath}' in document [${newObj.atCorpusPath}]`,
                    'getObjectFromCorpusPath'
                );
            }

            return result;
        }
    }

    /**
     * Fetches an object by the path from the corpus.
     * @param objectPath Object path, absolute or relative.
     * @param obj Optional parameter. When provided, it is used to obtain the FolderPath and the Namespace needed
     * to create the absolute path from a relative path.
     * @returns The object obtained from the provided path.
     */
    public async fetchObjectAsync<T>(objectPath: string, obj?: CdmObject): Promise<T> {
        return this._fetchObjectAsync(objectPath, obj) as undefined as T;
    }

    // a manifest or document can be saved with a new or exisitng name. This function on the corpus does all the actual work
    // because the corpus knows about persistence types and about the storage adapters
    // if saved with the same name, then consider this document 'clean' from changes. if saved with a back compat model or
    // to a different name, then the source object is still 'dirty'
    // an option will cause us to also save any linked documents.
    public async saveDocumentAs(
        doc: CdmDocumentDefinition,
        options: copyOptions,
        newName: string,
        saveReferenced: boolean): Promise<boolean> {
        // find out if the storage adapter is able to write.
        let ns: string = doc.namespace;
        if (ns === undefined) {
            ns = this.storage.defaultNamespace;
        }
        const adapter: StorageAdapter = this.storage.fetchAdapter(ns);
        if (adapter === undefined) {
            Logger.error(
                CdmCorpusDefinition.name,
                this.ctx,
                `Couldn't find a storage adapter registered for the namespace '${ns}'`,
                'saveDocumentAs'
            );

            return false;
        } else if (adapter.canWrite() === false) {
            Logger.error(
                CdmCorpusDefinition.name,
                this.ctx,
                `The storage adapter '${ns}' claims it is unable to write files.`,
                'saveDocumentAs'
            );

            return false;
        } else {
            // what kind of document is requested?
            const newNameInLowCase: string = newName.toLowerCase();
            const persistenceType: string =
                newNameInLowCase.endsWith(CdmCorpusDefinition.fetchModelJsonExtension()) ? 'ModelJson' : 'CdmFolder';

            // save the object into a json blob
            const resOpt: resolveOptions = { wrtDoc: doc, directives: new AttributeResolutionDirectiveSet() };
            let persistedDoc: object;
            if (newNameInLowCase.endsWith(CdmCorpusDefinition.fetchModelJsonExtension()) ||
                newNameInLowCase.endsWith(CdmCorpusDefinition.fetchManifestExtension())
                || newNameInLowCase.endsWith(CdmCorpusDefinition.fetchFolioExtension())) {
                if (persistenceType === 'CdmFolder') {
                    persistedDoc = cdmFolder.ManifestPersistence.toData(doc as CdmManifestDefinition, resOpt, options);
                } else {
                    if (newNameInLowCase !== CdmCorpusDefinition.fetchModelJsonExtension()) {
                        Logger.error(
                            CdmCorpusDefinition.name,
                            this.ctx,
                            `Failed to persist '${newName}', as it's not an acceptable filename. It must be model.json`, 'saveDocumentAs'
                        );

                        return false;
                    }
                    persistedDoc = modelJson.ManifestPersistence.toData(doc as CdmManifestDefinition, resOpt, options);
                }
            } else {
                persistedDoc = cdmFolder.DocumentPersistence.toData(doc as CdmManifestDefinition, resOpt, options);
            }

            if (!persistedDoc) {
                Logger.error(CdmCorpusDefinition.name, this.ctx, `Failed to persist '${newName}'`, 'saveDocumentAs');

                return false;
            }

            // turn the name into a path
            let newPath: string = `${doc.folderPath}/${newName}`;
            newPath = this.storage.createAbsoluteCorpusPath(newPath, doc);
            if (newPath.startsWith(`${ns}:`)) {
                newPath = newPath.slice(ns.length + 1);
            }
            try {
                // ask the adapter to make it happen
                const content: string = JSON.stringify(persistedDoc, undefined, 2);
                await adapter.writeAsync(newPath, content);

                // write the adapter's config.
                if (options.isTopLevelDocument) {
                    await this.storage.saveAdaptersConfig('/config.json', adapter);

                    // the next documentwon't be top level, so reset the flag
                    options.isTopLevelDocument = false;
                }
            } catch (e) {
                Logger.error(
                    CdmCorpusDefinition.name,
                    this.ctx,
                    `Failed to write to the file '${newName}' for reason ${e}`,
                    'saveDocumentAs'
                );

                return false;
            }

            // if we also want to save referenced docs, then it depends on what kind of thing just got saved
            // if a model.json there are none. If a manifest or definition doc then ask the docs to do the right things
            // definition will save imports, manifests will save imports, schemas, sub manifests
            if (saveReferenced && persistenceType === 'CdmFolder') {
                if (!await doc.saveLinkedDocuments(options)) {
                    Logger.error(
                        CdmCorpusDefinition.name,
                        this.ctx,
                        `Failed to save linked documents for file '${newName}'`,
                        'saveDocumentAs'
                    );
                }
            }

            return true;
        }
    }

    public setEventCallback(
        status: EventCallback,
        reportAtLevel: cdmStatusLevel = cdmStatusLevel.info
    ): void {
        const ctx: resolveContext = this.ctx as resolveContext;
        ctx.reportAtLevel = reportAtLevel;
        const eventCallback: EventCallback = (level: cdmStatusLevel, msg: string): void => {
            if (level >= ctx.reportAtLevel) {
                status(level, msg);
            }
        };
        ctx.statusEvent = eventCallback;
    }

    /**
     * @internal
     */
    public findMissingImportsFromDocument(doc: CdmDocumentDefinition): void {
        // let bodyCode = () =>
        {
            if (doc.imports) {
                for (const imp of doc.imports) {
                    if (!imp.doc) {
                        // no document set for this import, see if it is already loaded into the corpus
                        const path: string = this.storage.createAbsoluteCorpusPath(imp.corpusPath, doc);
                        if (!this.docsNotFound.has(path)) {
                            const lookup: [CdmFolderDefinition, CdmDocumentDefinition] = this.pathLookup.get(path.toLowerCase());
                            if (!lookup) {
                                this.docsNotLoaded.add(path);
                            }
                        }
                    }
                }
            }
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public setImportDocuments(doc: CdmDocumentDefinition): void {
        if (doc.imports) {
            for (const imp of doc.imports) {
                if (!imp.doc) {
                    // no document set for this import, see if it is already loaded into the corpus
                    const path: string = this.storage.createAbsoluteCorpusPath(imp.corpusPath, doc);
                    if (!this.docsNotFound.has(path)) {
                        const lookup: [CdmFolderDefinition, CdmDocumentDefinition] = this.pathLookup.get(path.toLowerCase());
                        if (lookup) {
                            const currentDoc: CdmDocumentDefinition = lookup['1'];
                            if (!currentDoc.importsIndexed && !currentDoc.currentlyIndexing) {
                                currentDoc.currentlyIndexing = true;
                                this.docsNotIndexed.add(currentDoc);
                            }
                            imp.doc = lookup[1];

                            // repeat the process for the import documents
                            this.setImportDocuments(imp.doc);
                        }
                    }
                }
            }
        }
    }

    /**
     * @internal
     */
    public async loadImportsAsync(doc: CdmDocumentDefinition): Promise<void> {
        const docsNowLoaded: Set<CdmDocumentDefinition> = new Set<CdmDocumentDefinition>();

        if (this.docsNotLoaded.size > 0) {
            await Promise.all(Array.from(this.docsNotLoaded)
                .map(async (missing: string) => {
                    if (!this.docsNotFound.has(missing) && !this.docsCurrentlyLoading.has(missing)) {
                        // set status to loading
                        this.docsNotLoaded.delete(missing);
                        this.docsCurrentlyLoading.add(missing);

                        // load it
                        const newDoc: CdmDocumentDefinition = await this.loadFolderOrDocument(missing) as CdmDocumentDefinition;

                        if (newDoc) {
                            Logger.info(CdmCorpusDefinition.name, this.ctx, `resolved import for '${newDoc.name}'`, doc.atCorpusPath);
                            // doc is now loaded
                            docsNowLoaded.add(newDoc);
                            // next step is that the doc needs to be indexed
                            this.docsNotIndexed.add(newDoc);
                            newDoc.currentlyIndexing = true;
                        } else {
                            Logger.warning(
                                CdmCorpusDefinition.name,
                                this.ctx,
                                `unable to resolve import for '${missing}'`,
                                doc.atCorpusPath
                            );
                            // set doc as not found
                            this.docsNotFound.add(missing);
                        }
                        // doc is no longer loading
                        this.docsCurrentlyLoading.delete(missing);
                    }
                }));

            // now that we've loaded new docs, find imports from them that need loading
            for (const loadedDoc of docsNowLoaded) {
                this.findMissingImportsFromDocument(loadedDoc);
            }

            // repeat this process for the imports of the imports
            await Promise.all(Array.from(docsNowLoaded)
                .map(async (loadedDoc: CdmDocumentDefinition) => {
                    await this.loadImportsAsync(loadedDoc);
                })
            );

            // now we know everything for the imports have been loaded
            // attach newly loaded import docs to import list
            //   note: we do not know if all imports for 'doc' are loaded
            //   because loadImportsAsync could have been called in parallel
            //   and a different call of loadImportsAsync could be loading an
            //   import that we will need
            for (const loadedDoc of docsNowLoaded) {
                this.setImportDocuments(loadedDoc);
            }
        }
    }

    /**
     * @internal
     */
    public async resolveImportsAsync(doc: CdmDocumentDefinition): Promise<void> {
        // find imports for this doc
        this.findMissingImportsFromDocument(doc);
        // load imports (and imports of imports)
        await this.loadImportsAsync(doc);
        // now that everything is loaded, attach import docs to this doc's import list
        this.setImportDocuments(doc);
    }

    /**
     * @internal
     */
    public checkObjectIntegrity(currentDoc: CdmDocumentDefinition): boolean {
        // let bodyCode = () =>
        {
            const ctx: resolveContext = this.ctx as resolveContext;
            let errorCount: number = 0;
            currentDoc.visit(
                '',
                (iObject: CdmObject, path: string) => {
                    if (iObject.validate() === false) {
                        Logger.error(
                            CdmCorpusDefinition.name,
                            ctx,
                            `integrity check failed for : '${path}'`,
                            currentDoc.folderPath + path
                        );
                        errorCount++;
                    } else {
                        (iObject as CdmObjectBase).ctx = ctx;
                    }
                    Logger.info(CdmCorpusDefinition.name, ctx, `checked '${path}'`, currentDoc.folderPath + path);

                    return false;
                },
                undefined
            );

            return errorCount === 0;
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public declareObjectDefinitions(currentDoc: CdmDocumentDefinition, relativePath: string): void {
        // let bodyCode = () =>
        {
            const ctx: resolveContext = this.ctx as resolveContext;
            const corpusPathRoot: string = currentDoc.folderPath + currentDoc.name;
            currentDoc.visit(
                relativePath,
                (iObject: CdmObject, path: string) => {
                    if (path.indexOf('(unspecified)') > 0) {
                        return true;
                    }
                    switch (iObject.objectType) {
                        case cdmObjectType.entityDef:
                        case cdmObjectType.parameterDef:
                        case cdmObjectType.traitDef:
                        case cdmObjectType.purposeDef:
                        case cdmObjectType.dataTypeDef:
                        case cdmObjectType.typeAttributeDef:
                        case cdmObjectType.entityAttributeDef:
                        case cdmObjectType.attributeGroupDef:
                        case cdmObjectType.constantEntityDef:
                        case cdmObjectType.attributeContextDef:
                        case cdmObjectType.localEntityDeclarationDef:
                        case cdmObjectType.referencedEntityDeclarationDef:
                            ctx.relativePath = relativePath;
                            const corpusPath: string = `${corpusPathRoot}/${path}`;
                            if (currentDoc.internalDeclarations.has(path)) {
                                Logger.error(CdmCorpusDefinition.name, ctx, `duplicate declaration for item '${path}'`, corpusPath);

                                return false;
                            }
                            currentDoc.internalDeclarations.set(path, iObject as CdmObjectDefinitionBase);
                            this.registerSymbol(path, currentDoc);

                            Logger.info(CdmCorpusDefinition.name, ctx, `declared '${path}'`, corpusPath);
                        default:
                    }

                    return false;
                },
                undefined
            );
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public constTypeCheck(
        resOpt: resolveOptions,
        currentDoc: CdmDocumentDefinition,
        paramDef: CdmParameterDefinition,
        aValue: ArgumentValue
    ): ArgumentValue {
        // let bodyCode = () =>
        {
            const ctx: resolveContext = this.ctx as resolveContext;
            let replacement: ArgumentValue = aValue;
            // if parameter type is entity, then the value should be an entity or ref to one
            // same is true of 'dataType' dataType
            if (paramDef.dataTypeRef) {
                const dt: CdmDataTypeDefinition = paramDef.dataTypeRef.fetchObjectDefinition(resOpt);
                // compare with passed in value or default for parameter
                let pValue: ArgumentValue = aValue;
                if (!pValue) {
                    pValue = paramDef.getDefaultValue();
                    replacement = pValue;
                }
                if (pValue) {
                    if (dt.isDerivedFrom('cdmObject', resOpt)) {
                        const expectedTypes: cdmObjectType[] = [];
                        let expected: string;
                        if (dt.isDerivedFrom('entity', resOpt)) {
                            expectedTypes.push(cdmObjectType.constantEntityDef);
                            expectedTypes.push(cdmObjectType.entityRef);
                            expectedTypes.push(cdmObjectType.entityDef);
                            expected = 'entity';
                        } else if (dt.isDerivedFrom('attribute', resOpt)) {
                            expectedTypes.push(cdmObjectType.attributeRef);
                            expectedTypes.push(cdmObjectType.typeAttributeDef);
                            expectedTypes.push(cdmObjectType.entityAttributeDef);
                            expected = 'attribute';
                        } else if (dt.isDerivedFrom('dataType', resOpt)) {
                            expectedTypes.push(cdmObjectType.dataTypeRef);
                            expectedTypes.push(cdmObjectType.dataTypeDef);
                            expected = 'dataType';
                        } else if (dt.isDerivedFrom('purpose', resOpt)) {
                            expectedTypes.push(cdmObjectType.purposeRef);
                            expectedTypes.push(cdmObjectType.purposeDef);
                            expected = 'purpose';
                        } else if (dt.isDerivedFrom('trait', resOpt)) {
                            expectedTypes.push(cdmObjectType.traitRef);
                            expectedTypes.push(cdmObjectType.traitDef);
                            expected = 'trait';
                        } else if (dt.isDerivedFrom('attributeGroup', resOpt)) {
                            expectedTypes.push(cdmObjectType.attributeGroupRef);
                            expectedTypes.push(cdmObjectType.attributeGroupDef);
                            expected = 'attributeGroup';
                        }

                        if (expectedTypes.length === 0) {
                            Logger.error(
                                CdmCorpusDefinition.name,
                                ctx,
                                `parameter '${paramDef.getName()}' has an unexpected dataType.`,
                                ctx.relativePath
                            );
                        }

                        // if a string constant, resolve to an object ref.
                        let foundType: cdmObjectType = cdmObjectType.error;
                        if (typeof pValue === 'object' && 'objectType' in pValue) {
                            foundType = pValue.objectType;
                        }
                        let foundDesc: string = ctx.relativePath;
                        if (!(pValue instanceof CdmObjectBase)) {
                            // pValue is a string or object
                            pValue = pValue as string;
                            if (pValue === 'this.attribute' && expected === 'attribute') {
                                // will get sorted out later when resolving traits
                                foundType = cdmObjectType.attributeRef;
                            } else {
                                foundDesc = pValue;
                                const seekResAtt: number = CdmObjectReferenceBase.offsetAttributePromise(pValue);
                                if (seekResAtt >= 0) {
                                    // get an object there that will get resolved later after resolved attributes
                                    replacement = new CdmAttributeReference(this.ctx, pValue, true);
                                    (replacement as CdmAttributeReference).inDocument = currentDoc;
                                    foundType = cdmObjectType.attributeRef;
                                } else {
                                    const lu: CdmObjectDefinitionBase = ctx.corpus.resolveSymbolReference(
                                        resOpt,
                                        currentDoc,
                                        pValue,
                                        cdmObjectType.error,
                                        true
                                    );
                                    if (lu) {
                                        if (expected === 'attribute') {
                                            replacement = new CdmAttributeReference(this.ctx, pValue, true);
                                            (replacement as CdmAttributeReference).inDocument = ctx.currentDoc;
                                            foundType = cdmObjectType.attributeRef;
                                        } else {
                                            replacement = lu;
                                            if (typeof replacement === 'object' && 'objectType' in replacement) {
                                                foundType = replacement.objectType;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (expectedTypes.indexOf(foundType) === -1) {
                            Logger.error(
                                CdmCorpusDefinition.name,
                                ctx,
                                `parameter '${paramDef.getName()}' has the dataType of '${expected}' but the value '${foundDesc}' does't resolve to a known ${expected} referenece`,
                                currentDoc.folderPath + ctx.relativePath
                            );
                        } else {
                            Logger.info(CdmCorpusDefinition.name, ctx, `    resolved '${foundDesc}'`, ctx.relativePath);
                        }
                    }
                }
            }

            return replacement;
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public resolveObjectDefinitions(resOpt: resolveOptions, currentDoc: CdmDocumentDefinition): void {
        // let bodyCode = () =>
        {
            const ctx: resolveContext = this.ctx as resolveContext;
            resOpt.indexingDoc = currentDoc;

            currentDoc.visit(
                '',
                (iObject: CdmObject, path: string) => {
                    const ot: cdmObjectType = iObject.objectType;
                    switch (ot) {
                        case cdmObjectType.attributeRef:
                        case cdmObjectType.attributeGroupRef:
                        case cdmObjectType.attributeContextRef:
                        case cdmObjectType.dataTypeRef:
                        case cdmObjectType.entityRef:
                        case cdmObjectType.purposeRef:
                        case cdmObjectType.traitRef:
                            ctx.relativePath = path;
                            const ref: CdmObjectReferenceBase = iObject as CdmObjectReferenceBase;

                            if (CdmObjectReferenceBase.offsetAttributePromise(ref.namedReference) < 0) {
                                const resNew: CdmObjectDefinitionBase = ref.fetchObjectDefinition(resOpt);

                                if (!resNew) {
                                    // it is 'ok' to not find entity refs sometimes

                                    if (ot === cdmObjectType.entityRef) {
                                        Logger.warning(
                                            CdmCorpusDefinition.name,
                                            ctx,
                                            `unable to resolve the reference '${ref.namedReference}' to a known object`,
                                            currentDoc.folderPath + path
                                        );
                                    } else {
                                        Logger.error(
                                            CdmCorpusDefinition.name,
                                            ctx,
                                            `unable to resolve the reference '${ref.namedReference}' to a known object`,
                                            currentDoc.folderPath + path
                                        );
                                    }
                                } else {
                                    Logger.info(
                                        CdmCorpusDefinition.name,
                                        ctx,
                                        `    resolved '${ref.namedReference}'`,
                                        currentDoc.folderPath + path
                                    );
                                }
                            }
                        default:
                    }

                    return false;
                },
                (iObject: CdmObject, path: string) => {
                    const ot: cdmObjectType = iObject.objectType;
                    switch (ot) {
                        case cdmObjectType.parameterDef:
                            // when a parameter has a datatype that is a cdm object, validate that any default value is the
                            // right kind object
                            const param: CdmParameterDefinition = iObject as CdmParameterDefinition;
                            this.constTypeCheck(resOpt, currentDoc, param, undefined);
                            break;
                        default:
                    }

                    return false;
                }
            );
        }
        resOpt.indexingDoc = undefined;

        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public resolveTraitArguments(resOpt: resolveOptions, currentDoc: CdmDocumentDefinition): void {
        // let bodyCode = () =>
        {
            const ctx: resolveContext = this.ctx as resolveContext;
            currentDoc.visit(
                '',
                (iObject: CdmObject, path: string) => {
                    const ot: cdmObjectType = iObject.objectType;
                    switch (ot) {
                        case cdmObjectType.traitRef:
                            ctx.pushScope(iObject.fetchObjectDefinition<CdmTraitDefinition>(resOpt));
                            break;
                        case cdmObjectType.argumentDef:
                            try {
                                if (ctx.currentScope.currentTrait) {
                                    ctx.relativePath = path;
                                    const params: ParameterCollection = ctx.currentScope.currentTrait.fetchAllParameters(resOpt);
                                    let paramFound: CdmParameterDefinition;
                                    let aValue: ArgumentValue;
                                    if (ot === cdmObjectType.argumentDef) {
                                        paramFound = params.resolveParameter(
                                            ctx.currentScope.currentParameter,
                                            (iObject as CdmArgumentDefinition).getName()
                                        );
                                        (iObject as CdmArgumentDefinition).resolvedParameter = paramFound;
                                        aValue = (iObject as CdmArgumentDefinition).value;

                                        // if parameter type is entity, then the value should be an entity or ref to one
                                        // same is true of 'dataType' dataType
                                        aValue = this.constTypeCheck(resOpt, currentDoc, paramFound, aValue);
                                        (iObject as CdmArgumentDefinition).setValue(aValue);
                                    }
                                }
                            } catch (e) {
                                Logger.error(CdmCorpusDefinition.name, ctx, (e as Error).toString(), path);
                                Logger.error(
                                    CdmCorpusDefinition.name,
                                    ctx,
                                    `failed to resolve parameter on trait '${ctx.currentScope.currentTrait.getName()}'`,
                                    currentDoc.folderPath + path
                                );
                            }
                            ctx.currentScope.currentParameter++;
                        default:
                    }

                    return false;
                },
                (iObject: CdmObject, path: string) => {
                    const ot: cdmObjectType = iObject.objectType;
                    if (ot === cdmObjectType.traitRef) {
                        (iObject as CdmTraitReference).resolvedArguments = true;
                        ctx.popScope();
                    }

                    return false;
                }
            );

            return;
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public finishDocumentResolve(doc: CdmDocumentDefinition): void {
        // let bodyCode = () =>
        doc.currentlyIndexing = false;
        doc.importsIndexed = true;
        doc.needsIndexing = false;
        this.docsNotIndexed.delete(doc);

        for (const def of doc.definitions.allItems) {
            if (isEntityDefinition(def)) {
                Logger.info(CdmCorpusDefinition.name, this.ctx as resolveContext, `indexed: ${def.atCorpusPath}`);
            }
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     */
    public finishResolve(): void {
        // let bodyCode = () =>
        {
            const ctx: resolveContext = this.ctx as resolveContext;
            Logger.debug(CdmCorpusDefinition.name, ctx, 'finishing...');
            for (const fd of this.allDocuments) {
                this.finishDocumentResolve(fd[1]);
            }
        }
        // return p.measure(bodyCode);
    }

    /**
     * @internal
     * Returns the last modified time of the file where the object at the corpusPath can be found
     * @param corpusPath The corpus path to a CDM object
     */
    public async computeLastModifiedTimeAsync(corpusPath: string, obj?: CdmObject): Promise<Date> {
        const currObject: CdmObject = await this.fetchObjectAsync(corpusPath, obj);
        if (currObject) {
            return this.getLastModifiedTimeAsyncFromObject(currObject);
        }
    }

    /**
     * @internal
     * Returns the last modified time of the file where the input object can be found
     * @param currObject A CDM object
     */
    public async getLastModifiedTimeAsyncFromObject(currObject: CdmObject): Promise<Date> {
        if ((currObject as CdmContainerDefinition).namespace) {
            const adapter: StorageAdapter = this.storage.fetchAdapter((currObject as CdmContainerDefinition).namespace);

            if (adapter === undefined) {
                Logger.error(
                    CdmCorpusDefinition.name,
                    this.ctx,
                    `Adapter not found for the CDM object by ID ${(currObject as CdmContainerDefinition).ID}`,
                    `getLastModifiedTimeFromObject`
                );

                return undefined;
            }

            return adapter.computeLastModifiedTimeAsync(currObject.atCorpusPath);
        } else {
            return this.getLastModifiedTimeAsyncFromObject(currObject.inDocument);
        }
    }

    /**
     * @internal
     * Returns the last modified time of a partition object, does not try to open the file
     * as getLastModifiedTime does
     * @param corpusPath The corpus path to a CDM object
     */
    public async getLastModifiedTimeFromPartitionPath(corpusPath: string): Promise<Date> {
        // we do not want to load partitions from file, just check the modified times
        const pathTuple: [string, string] = this.storage.splitNamespacePath(corpusPath);
        const namespace: string = pathTuple[0];
        if (namespace) {
            const adapter: StorageAdapter = this.storage.fetchAdapter(namespace);

            if (adapter === undefined) {
                Logger.error(
                    CdmCorpusDefinition.name,
                    this.ctx,
                    `Adapter not found for the corpus path '${corpusPath}'.`,
                    'getLastModifiedTimeFromPartitionPath'
                );

                return undefined;
            }

            return adapter.computeLastModifiedTimeAsync(corpusPath);
        }
    }

    /**
     * Returns a list of relationships where the input entity is the incoming entity
     * @param entity The entity that we want to get relationships for
     */
    public fetchIncomingRelationships(entity: CdmEntityDefinition): CdmE2ERelationship[] {
        if (this.incomingRelationships !== undefined && this.incomingRelationships.has(entity)) {
            return this.incomingRelationships.get(entity);
        }

        return [];
    }

    /**
     * Returns a list of relationships where the input entity is the outgoing entity
     * @param entity The entity that we want to get relationships for
     */
    public fetchOutgoingRelationships(entity: CdmEntityDefinition): CdmE2ERelationship[] {
        if (this.outgoingRelationships !== undefined && this.outgoingRelationships.has(entity)) {
            return this.outgoingRelationships.get(entity);
        }

        return [];
    }

    /**
     * Calculates the entity to entity relationships for all the entities present in the manifest and its sub-manifests.
     * @param currManifest The manifest (and any sub-manifests it contains) that we want to calculate relationships for.
     */
    public async calculateEntityGraphAsync(currManifest: CdmManifestDefinition): Promise<void> {
        await this._calculateEntityGraphAsync(currManifest);
    }

    /**
     * Calculates the entity to entity relationships for all the entities present in the manifest and its sub-manifests.
     * @param currManifest The manifest (and any sub-manifests it contains) that we want to calculate relationships for.
     * @returns A Promise for the completion of entity graph calculation.
     */
    public async _calculateEntityGraphAsync(currManifest: CdmManifestDefinition, resEntMap?: Map<string, string>): Promise<void> {
        for (const entityDec of currManifest.entities) {
            const entityPath: string = await currManifest.getEntityPathFromDeclaration(entityDec, currManifest);
            // the path returned by GetEntityPathFromDeclaration is an absolute path.
            // no need to pass the manifest to FetchObjectAsync.
            const entity: CdmEntityDefinition = await this.fetchObjectAsync<CdmEntityDefinition>(entityPath);

            if (!entity) {
                continue;
            }

            let resEntity: CdmEntityDefinition;
            const resOpt: resolveOptions = new resolveOptions(entity.inDocument);

            const isResolvedEntity: boolean = entity.attributeContext !== undefined;

            // only create a resolved entity if the entity passed in was not a resolved entity
            if (!isResolvedEntity) {
                // first get the resolved entity so that all of the references are present
                resEntity = await entity.createResolvedEntityAsync(`wrtSelf_${entity.entityName}`, resOpt);
            } else {
                resEntity = entity;
            }

            if (!this.symbol2EntityDefList.has(entity.entityName)) {
                this.symbol2EntityDefList.set(entity.entityName, []);
            }

            this.symbol2EntityDefList.get(entity.entityName)
                .push(entity);

            // find outgoing entity relationships using attribute context
            const outgoingRelationships: CdmE2ERelationship[] =
                this.findOutgoingRelationships(resOpt, resEntity, resEntity.attributeContext);

            // if the entity is a resolved entity, change the relationships to point to the resolved versions
            if (isResolvedEntity && resEntMap) {
                for (const rel of outgoingRelationships) {
                    if (resEntMap.has(rel.toEntity)) {
                        rel.toEntity = resEntMap.get(rel.toEntity);
                    }
                }
            }

            this.outgoingRelationships.set(entity, outgoingRelationships);

            // flip outgoing entity relationships list to get incoming relationships map
            for (const rel of this.outgoingRelationships.get(entity)) {
                const targetEnt: CdmEntityDefinition = await this.fetchObjectAsync<CdmEntityDefinition>(rel.toEntity, currManifest);
                if (targetEnt) {
                    if (!this.incomingRelationships.has(targetEnt)) {
                        this.incomingRelationships.set(targetEnt, []);
                    }
                    this.incomingRelationships.get(targetEnt)
                        .push(rel);
                }
            }

            // delete the resolved entity if we created one here
            if (!isResolvedEntity) {
                resEntity.inDocument.folder.documents.remove(resEntity.inDocument.name);
            }
        }

        for (const subManifestDef of currManifest.subManifests) {
            const corpusPath: string = this.storage.createAbsoluteCorpusPath(subManifestDef.definition, currManifest);
            const subManifest: CdmManifestDefinition = await this.fetchObjectAsync<CdmManifestDefinition>(corpusPath);
            if (subManifest) {
                await this.calculateEntityGraphAsync(subManifest);
            }
        }
    }

    public findOutgoingRelationships(
        resOpt: resolveOptions,
        resEntity: CdmEntityDefinition,
        attCtx: CdmAttributeContext,
        outerAttGroup?: CdmAttributeContext): CdmE2ERelationship[] {
        const outRels: CdmE2ERelationship[] = [];
        if (attCtx && attCtx.contents) {
            for (const subAttCtx of attCtx.contents.allItems) {
                // find entity references that identifies the 'this' entity
                const child: CdmAttributeContext = subAttCtx as CdmAttributeContext;
                if (child.definition && child.definition.getObjectType() === cdmObjectType.entityRef) {
                    const toAtt: string[] = child.exhibitsTraits.allItems.filter(
                        (x: CdmTraitReference) => { return x.namedReference === 'is.identifiedBy' && x.arguments.length > 0; })
                        .map((y: CdmTraitReference) => {
                            const namedRef: string = (y.arguments.allItems[0].value as CdmAttributeReference).namedReference;

                            return namedRef.slice(namedRef.lastIndexOf('/') + 1);
                        });

                    const toEntity: CdmEntityDefinition = child.definition.fetchObjectDefinition<CdmEntityDefinition>(resOpt);

                    // entity references should have the "is.identifiedBy" trait, and the entity ref should be valid
                    if (toAtt.length === 1 && toEntity) {
                        // get the attribute name from the foreign key
                        const findAddedAttributeIdentity = (context: CdmAttributeContext): string => {
                            if (context.contents) {
                                for (const sub of context.contents.allItems) {
                                    const subCtx: CdmAttributeContext = sub as CdmAttributeContext;
                                    if (subCtx.type === cdmAttributeContextType.entity) {
                                        continue;
                                    }
                                    const fk: string = findAddedAttributeIdentity(subCtx);
                                    if (fk) {
                                        return fk;
                                    } else if (subCtx && subCtx.type === cdmAttributeContextType.addedAttributeIdentity
                                        && subCtx.contents && subCtx.contents.allItems[0]) {
                                        // entity references should have the "is.identifiedBy" trait, and the entity def should be valid
                                        return (subCtx.contents.allItems[0] as CdmObjectReference).namedReference;
                                    }
                                }
                            }
                        };

                        const foreignKey: string = findAddedAttributeIdentity(outerAttGroup || attCtx);

                        if (foreignKey) {
                            const fromAtt: string = foreignKey.slice(foreignKey.lastIndexOf('/') + 1)
                                .replace(`${child.name}_`, '');

                            const newE2ERel: CdmE2ERelationship = new CdmE2ERelationship(this.ctx, '');
                            newE2ERel.fromEntity =
                                this.storage.createAbsoluteCorpusPath(resEntity.atCorpusPath.replace(/wrtSelf_/g, ''), resEntity);
                            newE2ERel.fromEntityAttribute = fromAtt;
                            newE2ERel.toEntity =
                                this.storage.createAbsoluteCorpusPath(toEntity.atCorpusPath.replace(/wrtSelf_/g, ''), toEntity);
                            newE2ERel.toEntityAttribute = toAtt[0];
                            outRels.push(newE2ERel);
                        }
                    }
                } else if (child && child.definition && child.definition.getObjectType() === cdmObjectType.attributeGroupRef) {
                    // if this is an attribute group, we need to search for foreign keys from this level
                    outerAttGroup = child;
                }

                // repeat the process on the child node
                const subOutRels: CdmE2ERelationship[] = this.findOutgoingRelationships(resOpt, resEntity, child, outerAttGroup);
                outerAttGroup = undefined;
                outRels.push.apply(outRels, subOutRels);
            }
        }

        return outRels;
    }

    /**
     * Resolves references according to the provided stages and validates.
     * @returns The validation step that follows the completed step
     */
    public async resolveReferencesAndValidateAsync(
        stage: cdmValidationStep,
        stageThrough: cdmValidationStep,
        resOpt: resolveOptions
    ): Promise<cdmValidationStep> {
        // let bodyCode = () =>
        {
            return new Promise<cdmValidationStep>(
                async (resolve: (value?: cdmValidationStep | PromiseLike<cdmValidationStep>) => void): Promise<void> => {
                    // use the provided directives or make a relational default
                    let directives: AttributeResolutionDirectiveSet;
                    if (resOpt) {
                        directives = resOpt.directives;
                    } else {
                        directives = new AttributeResolutionDirectiveSet(new Set<string>(['referenceOnly', 'normalized']));
                    }
                    resOpt = { wrtDoc: undefined, directives: directives, relationshipDepth: 0 };

                    for (const doc of this.allDocuments) {
                        await doc[1].indexIfNeeded(resOpt);
                    }

                    const finishresolve: boolean = stageThrough === stage;
                    switch (stage) {
                        case cdmValidationStep.start:
                        case cdmValidationStep.traitAppliers:
                            this.resolveReferencesStep(
                                'defining traits...',
                                (currentDoc: CdmDocumentDefinition, resOptions: resolveOptions, entityNesting: number) => { },
                                resOpt,
                                true,
                                finishresolve || stageThrough === cdmValidationStep.minimumForResolving,
                                cdmValidationStep.traits
                            );

                            return;
                        case cdmValidationStep.traits:
                            this.resolveReferencesStep(
                                'resolving traits...',
                                (currentDoc: CdmDocumentDefinition, resOptions: resolveOptions, entityNesting: number) => {
                                    this.resolveTraits(currentDoc, resOptions, entityNesting);
                                },
                                resOpt,
                                false,
                                finishresolve,
                                cdmValidationStep.traits
                            );
                            this.resolveReferencesStep(
                                'checking required arguments...',
                                (currentDoc: CdmDocumentDefinition, resOptions: resolveOptions, entityNesting: number) => {
                                    this.resolveReferencesTraitsArguments(currentDoc, resOptions, entityNesting);
                                },
                                resOpt,
                                true,
                                finishresolve,
                                cdmValidationStep.attributes
                            );

                            return;
                        case cdmValidationStep.attributes:
                            this.resolveReferencesStep(
                                'resolving attributes...',
                                (currentDoc: CdmDocumentDefinition, resOptions: resolveOptions, entityNesting: number) => {
                                    this.resolveAttributes(currentDoc, resOptions, entityNesting);
                                },
                                resOpt,
                                true,
                                finishresolve,
                                cdmValidationStep.entityReferences
                            );

                            return;
                        case cdmValidationStep.entityReferences:
                            this.resolveReferencesStep(
                                'resolving foreign key references...',
                                (currentDoc: CdmDocumentDefinition, resOptions: resolveOptions, entityNesting: number) => {
                                    this.resolveForeignKeyReferences(currentDoc, resOptions, entityNesting);
                                },
                                resOpt,
                                true,
                                true,
                                cdmValidationStep.finished
                            );

                            return;
                        default:
                    }

                    // bad step sent in
                    resolve(cdmValidationStep.error);
                }
            );
        }
    }

    private removeObjectDefinitions(doc: CdmDocumentDefinition): void {
        // let bodyCode = () =>
        {
            const ctx: resolveContext = this.ctx as resolveContext;
            doc.visit(
                '',
                (iObject: CdmObject, path: string) => {
                    if (path.indexOf('(unspecified)') > 0) {
                        return true;
                    }
                    switch (iObject.objectType) {
                        case cdmObjectType.entityDef:
                        case cdmObjectType.parameterDef:
                        case cdmObjectType.traitDef:
                        case cdmObjectType.purposeDef:
                        case cdmObjectType.dataTypeDef:
                        case cdmObjectType.typeAttributeDef:
                        case cdmObjectType.entityAttributeDef:
                        case cdmObjectType.attributeGroupDef:
                        case cdmObjectType.constantEntityDef:
                        case cdmObjectType.attributeContextDef:
                        case cdmObjectType.localEntityDeclarationDef:
                        case cdmObjectType.referencedEntityDeclarationDef:
                            this.unRegisterSymbol(path, doc);
                            this.unRegisterDefinitionReferenceDocuments(iObject, 'rasb');
                        default:
                    }

                    return false;
                },
                undefined
            );
        }
        // return p.measure(bodyCode);
    }

    private registerSymbol(symbolDef: string, inDoc: CdmDocumentDefinition): void {
        // let bodyCode = () =>
        {
            let docs: CdmDocumentDefinition[] = this.symbolDefinitions.get(symbolDef);
            if (!docs) {
                docs = [];

                this.symbolDefinitions.set(symbolDef, docs);
            }

            docs.push(inDoc);
        }
        // return p.measure(bodyCode);
    }

    private unRegisterSymbol(symbolDef: string, inDoc: CdmDocumentDefinition): void {
        // let bodyCode = () =>
        {
            // if the symbol is listed for the given doc, remove it
            const docs: CdmDocumentDefinition[] = this.symbolDefinitions.get(symbolDef);
            if (docs) {
                const index: number = docs.indexOf(inDoc);
                if (index !== -1) {
                    docs.splice(index, 1);
                }
            }
        }
        // return p.measure(bodyCode);
    }

    private resolveTraits(currentDoc: CdmDocumentDefinition, resOpt: resolveOptions, entityNesting: number): void {
        const ctx: resolveContext = this.ctx as resolveContext;
        currentDoc.visit(
            '',
            (iObject: CdmObject, path: string) => {
                switch (iObject.objectType) {
                    case cdmObjectType.entityDef:
                    case cdmObjectType.attributeGroupDef:
                        entityNesting++;
                        // don't do this for entities and groups defined within entities since getting traits already does that
                        if (entityNesting > 1) {
                            break;
                        }
                    case cdmObjectType.traitDef:
                    case cdmObjectType.purposeDef:
                    case cdmObjectType.dataTypeDef:
                        (this.ctx as resolveContext).relativePath = path;
                        (iObject as CdmObjectDefinition).fetchResolvedTraits(resOpt);
                        break;
                    case cdmObjectType.entityAttributeDef:
                    case cdmObjectType.typeAttributeDef:
                        ctx.relativePath = path;
                        (iObject as CdmAttribute).fetchResolvedTraits(resOpt);
                    default:
                }

                return false;
            },
            (iObject: CdmObject, path: string) => {
                if (isEntityDefinition(iObject) || isAttributeGroupDefinition(iObject)) {
                    entityNesting--;
                }

                return false;
            }
        );
    }

    private resolveReferencesTraitsArguments(currentDoc: CdmDocumentDefinition, resOpt: resolveOptions, entityNesting: number): void {
        const ctx: resolveContext = this.ctx as resolveContext;
        const checkRequiredParamsOnResolvedTraits: (obj: CdmObject) => void = (obj: CdmObject): void => {
            const rts: ResolvedTraitSet = obj.fetchResolvedTraits(resOpt);
            if (rts) {
                const l: number = rts.size;
                for (let i: number = 0; i < l; i++) {
                    const rt: ResolvedTrait = rts.set[i];
                    let found: number = 0;
                    let resolved: number = 0;
                    if (rt.parameterValues) {
                        const parameterValuesCount: number = rt.parameterValues.length;
                        for (let iParam: number = 0; iParam < parameterValuesCount; iParam++) {
                            if (rt.parameterValues.fetchParameterAtIndex(iParam)
                                .getRequired()) {
                                found++;
                                if (!rt.parameterValues.fetchValue(iParam)) {
                                    const paramName: string = rt.parameterValues.fetchParameterAtIndex(iParam)
                                        .getName();
                                    const objectName: string = obj.fetchObjectDefinition(resOpt)
                                        .getName();
                                    Logger.error(
                                        CdmCorpusDefinition.name,
                                        ctx,
                                        `no argument supplied for required parameter '${paramName}' of trait '${
                                        rt.traitName
                                        }' on '${objectName}'`,
                                        currentDoc.folderPath + ctx.relativePath
                                    );
                                } else {
                                    resolved++;
                                }
                            }
                        }
                    }
                    if (found > 0 && found === resolved) {
                        Logger.info(
                            CdmCorpusDefinition.name,
                            ctx,
                            `found and resolved '${found}' required parameters of trait '${rt.traitName}' on '${obj
                                .fetchObjectDefinition(resOpt)
                                .getName()}'`,
                            currentDoc.folderPath + ctx.relativePath
                        );
                    }
                }
            }
        };

        currentDoc.visit('', undefined, (iObject: CdmObject, path: string) => {
            const ot: cdmObjectType = iObject.objectType;
            if (ot === cdmObjectType.entityDef) {
                ctx.relativePath = path;
                // get the resolution of all parameters and values through inheritence and defaults and arguments, etc.
                checkRequiredParamsOnResolvedTraits(iObject);
                // do the same for all attributes
                if ((iObject as CdmEntityDefinition).attributes) {
                    for (const attDef of (iObject as CdmEntityDefinition).attributes) {
                        checkRequiredParamsOnResolvedTraits(attDef);
                    }
                }
            }
            if (ot === cdmObjectType.attributeGroupDef) {
                ctx.relativePath = path;
                // get the resolution of all parameters and values through inheritence and defaults and arguments, etc.
                checkRequiredParamsOnResolvedTraits(iObject);
                // do the same for all attributes
                if ((iObject as CdmAttributeGroupDefinition).members) {
                    for (const attDef of (iObject as CdmAttributeGroupDefinition).members) {
                        checkRequiredParamsOnResolvedTraits(attDef);
                    }
                }
            }

            return false;
        });
    }

    private resolveAttributes(currentDoc: CdmDocumentDefinition, resOpt: resolveOptions, entityNesting: number): void {
        const ctx: resolveContext = this.ctx as resolveContext;
        currentDoc.visit(
            '',
            (iObject: CdmObject, path: string) => {
                const ot: cdmObjectType = iObject.objectType;
                if (ot === cdmObjectType.entityDef) {
                    entityNesting++; // get resolved att is already recursive, so don't compound
                    if (entityNesting === 1) {
                        ctx.relativePath = path;
                        (iObject as CdmEntityDefinition).fetchResolvedAttributes(resOpt);
                    }
                }
                if (ot === cdmObjectType.attributeGroupDef) {
                    entityNesting++;
                    if (entityNesting === 1) {
                        // entity will do this for the group defined inside it
                        ctx.relativePath = path;
                        (iObject as CdmAttributeGroupDefinition).fetchResolvedAttributes(resOpt);
                    }
                }

                return false;
            },
            (iObject: CdmObject, path: string) => {
                if (isEntityDefinition(iObject) || isAttributeGroupDefinition(iObject)) {
                    entityNesting--;
                }

                return false;
            }
        );
    }

    private resolveForeignKeyReferences(currentDoc: CdmDocumentDefinition, resOpt: resolveOptions, entityNesting: number): void {
        currentDoc.visit(
            '',
            (iObject: CdmObject, path: string) => {
                const ot: cdmObjectType = iObject.objectType;
                if (ot === cdmObjectType.attributeGroupDef) {
                    entityNesting++;
                }
                if (ot === cdmObjectType.entityDef) {
                    entityNesting++;
                    if (entityNesting === 1) {
                        // get resolved is recursive, so no need
                        (this.ctx as resolveContext).relativePath = path;
                        (iObject as CdmEntityDefinition).fetchResolvedEntityReference(resOpt);
                    }
                }

                return false;
            },
            (iObject: CdmObject, path: string) => {
                if (isEntityDefinition(iObject) || isAttributeGroupDefinition(iObject)) {
                    entityNesting--;
                }

                return false;
            }
        );
    }

    private resolveReferencesStep(
        statusMessage: string,
        resolveAction: (currentDoc: CdmDocumentDefinition, resOpt: resolveOptions, entityNesting: number) => void,
        resolveOpt: resolveOptions,
        stageFinished: boolean,
        finishResolve: boolean,
        nextStage: cdmValidationStep
    ): cdmValidationStep {
        const ctx: resolveContext = this.ctx as resolveContext;
        Logger.debug(CdmCorpusDefinition.name, ctx, statusMessage);
        const entityNesting: number = 0;
        for (const fd of this.allDocuments) {
            // cache import documents
            const currentDoc: CdmDocumentDefinition = fd[1];
            resolveOpt.wrtDoc = currentDoc;
            resolveAction(currentDoc, resolveOpt, entityNesting);
        }
        if (stageFinished) {
            if (finishResolve) {
                this.finishResolve();

                return cdmValidationStep.finished;
            }

            return nextStage;
        }

        return nextStage;
    }

    // Generates the warnings for a single document.
    private async generateWarningsForSingleDoc(doc: CdmDocumentDefinition, resOpt: resolveOptions): Promise<void> {
        if (doc.getDefinitions() === undefined) {
            return;
        }

        const ctx: resolveContext = this.ctx as resolveContext;

        resOpt.wrtDoc = doc;

        // check if primary key is missing and report if so
        await Promise.all(doc.definitions.allItems
            .map(async (element: CdmObjectDefinition) => {
                if (element instanceof CdmEntityDefinition && (element).attributes !== undefined) {
                    const resolvedEntity: CdmEntityDefinition = await element.createResolvedEntityAsync(`${element.entityName}_`, resOpt);

                    // tslint:disable-next-line:no-suspicious-comment
                    // TODO: Add additional checks here.
                    this.checkPrimaryKeyAttributes(resolvedEntity, resOpt, ctx);
                }
            })
        );

        resOpt.wrtDoc = undefined;
    }

    /**
     * Checks whether a resolved entity has an "is.identifiedBy" trait.
     */
    private checkPrimaryKeyAttributes(resolvedEntity: CdmEntityDefinition, resOpt: resolveOptions, ctx: resolveContext): void {
        if (resolvedEntity.fetchResolvedTraits(resOpt)
            .find(resOpt, 'is.identifiedBy') === undefined) {

            Logger.warning(CdmCorpusDefinition.name, ctx, `There is a primary key missing for the entity ${resolvedEntity.getName()}.`);
        }
    }

    private reportErrorStatus(found: CdmObjectDefinitionBase, symbolDef: string, expectedType: cdmObjectType): CdmObjectDefinitionBase {
        const ctx: resolveContext = this.ctx as resolveContext;
        switch (expectedType) {
            case cdmObjectType.traitRef:
                if (!isCdmTraitDefinition(found)) {
                    Logger.error(CdmCorpusDefinition.name, ctx, 'expected type trait', symbolDef);

                    return undefined;
                }
                break;
            case cdmObjectType.dataTypeRef:
                if (!isDataTypeDefinition(found)) {
                    Logger.error(CdmCorpusDefinition.name, ctx, 'expected type dataType', symbolDef);

                    return undefined;
                }
                break;
            case cdmObjectType.entityRef:
                if (!isEntityDefinition(found)) {
                    Logger.error(CdmCorpusDefinition.name, ctx, 'expected type entity', symbolDef);

                    return undefined;
                }
                break;
            case cdmObjectType.parameterDef:
                if (!isParameterDefinition(found)) {
                    Logger.error(CdmCorpusDefinition.name, ctx, 'expected type parameter', symbolDef);

                    return undefined;
                }
                break;
            case cdmObjectType.purposeRef:
                if (!isPurposeDefinition(found)) {
                    Logger.error(CdmCorpusDefinition.name, ctx, 'expected type purpose', symbolDef);

                    return undefined;
                }
                break;
            case cdmObjectType.attributeGroupRef:
                if (!isAttributeGroupDefinition(found)) {
                    Logger.error(CdmCorpusDefinition.name, ctx, 'expected type attributeGroup', symbolDef);

                    return undefined;
                }
            default:
        }

        return found;
    }

    private isPathManifestDocument(path: string): boolean {
        return path.endsWith(CdmCorpusDefinition.fetchManifestExtension())
            || path.endsWith(CdmCorpusDefinition.fetchModelJsonExtension())
            || path.endsWith(CdmCorpusDefinition.fetchFolioExtension());
    }

    private pathToSymbol(symbol: string, docFrom: CdmDocumentDefinition, docResultTo: docsResult): string {
        // if no destination given, no path to look for
        if (docResultTo.docBest === undefined) {
            return undefined;
        }

        // if there, return
        if (docFrom === docResultTo.docBest) {
            return docResultTo.newSymbol;
        }

        // if the to Doc is imported directly here,
        let pri: number;
        if (docFrom.importPriorities.importPriority.has(docResultTo.docBest)) {
            pri = docFrom.importPriorities.importPriority.get(docResultTo.docBest);

            // if the imported version is the highest priority, we are good
            if (!docResultTo.docList || docResultTo.docList.length === 1) {
                return symbol;
            }

            // more than 1 symbol, see if highest pri
            let maxPri: number = -1;
            for (const docCheck of docResultTo.docList) {
                const priCheck: number = docFrom.importPriorities.importPriority.get(docCheck);
                if (priCheck > maxPri) {
                    maxPri = priCheck;
                }
            }
            if (maxPri === pri) {
                return symbol;
            }
        }

        // can't get there directly, check the monikers
        if (docFrom.importPriorities.monikerPriorityMap !== undefined) {
            for (const kv of docFrom.importPriorities.monikerPriorityMap) {
                const tryMoniker: string = this.pathToSymbol(symbol, kv[1], docResultTo);
                if (tryMoniker !== undefined) {
                    return `${kv[0]}/${tryMoniker}`;
                }
            }
        }

        return undefined;
    }
}
