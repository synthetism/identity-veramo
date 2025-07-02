import type { Dependencies } from "../../common/types/dependencies";

export type DidDependencies = Pick<Dependencies, 
  "didService" |
  "vaultOperator" |
  "logger" 
>;