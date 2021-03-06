﻿namespace Microsoft.CommonDataModel.ObjectModel.Persistence.CdmFolder
{
    using Microsoft.CommonDataModel.ObjectModel.Cdm;
    using Microsoft.CommonDataModel.ObjectModel.Enums;
    using Microsoft.CommonDataModel.ObjectModel.Utilities;
    using Newtonsoft.Json.Linq;
    using System.Collections.Generic;

    class TraitReferencePersistence
    {
        public static CdmTraitReference FromData(CdmCorpusContext ctx, JToken obj)
        {
            if (obj == null)
            {
                return null;
            }

            bool simpleReference = true;
            dynamic trait;
            JToken args = null;

            if (obj is JValue)
            {
                trait = obj;
            }
            else
            {
                simpleReference = false;
                args = obj["arguments"];
                if (obj["traitReference"] is JValue)
                    trait = (string)obj["traitReference"];
                else
                    trait = TraitPersistence.FromData(ctx, obj["traitReference"]);
            }

            CdmTraitReference traitReference = ctx.Corpus.MakeRef<CdmTraitReference>(CdmObjectType.TraitRef, trait, simpleReference);
            if (args != null)
            {
                foreach (var a in args)
                {
                    traitReference.Arguments.Add(ArgumentPersistence.FromData(ctx, a));
                }
            }
            return traitReference;
        }

        public static dynamic ToData(CdmTraitReference instance, ResolveOptions resOpt, CopyOptions options)
        {
            return CdmObjectRefPersistence.ToData(instance, resOpt, options);
        }
    }
}
