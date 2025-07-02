import type { Dependencies } from "../../common/types/dependencies";

export type KeyDependencies = Pick<Dependencies, 
  "keyService" |
  "privateKeyService" | 
  "vaultOperator" |
  "logger" 
>;