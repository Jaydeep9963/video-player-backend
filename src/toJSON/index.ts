import { Schema } from 'mongoose';

/**
 * A mongoose schema plugin that converts the _id to id, removes __v, and removes private paths
 */

export const toJSON = (schema: Schema) => {
  let transform: Function | undefined;
  const currentToJSON = schema.get("toJSON");

  // Check if transform exists and is a function (not just boolean true)
  if (
    currentToJSON &&
    currentToJSON.transform &&
    typeof currentToJSON.transform === "function"
  ) {
    transform = currentToJSON.transform;
  }

  schema.set("toJSON", {
    ...currentToJSON,
    transform(doc: any, ret: any, options: any) {
      Object.keys(schema.paths).forEach((path) => {
        const pathSchema = (schema.paths as any)[path];
        if (pathSchema.options && pathSchema.options.private) {
          delete ret[path];
        }
      });

      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;

      // Only call transform if it's actually a function
      if (transform) {
        return transform(doc, ret, options);
      }
    },
  });
};