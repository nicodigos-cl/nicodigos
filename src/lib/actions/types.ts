export type ActionResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
