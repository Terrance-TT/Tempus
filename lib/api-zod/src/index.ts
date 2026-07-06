export * from "./generated/api";
export * from "./generated/types";
// Routes that have BOTH a path param and a query param cause orval to emit a
// path-param zod schema (in generated/api) and a query-param type (in
// generated/types) that share the `<Operation>Params` name. Re-export the zod
// versions explicitly so the barrel resolves the ambiguity to the schemas the
// api-server validates request params with.
export {
  GetScheduleParams,
  DeleteScheduleParams,
  DeleteCommitmentParams,
  DeleteAssignmentParams,
} from "./generated/api";
