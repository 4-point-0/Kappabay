import { CONFIG } from "../config";

export type ApiPagination = {
  take?: number;
  orderBy?: {
    id: "asc" | "desc";
  };
  cursor?: {
    id: number;
  };
  skip?: number;
};

export enum WhereParamTypes {
  STRING,
  NUMBER,
  BOOLEAN,
  DATE,
}

export type WhereParam = {
  key: string;
  type: WhereParamTypes;
};

// Add accepted parameters for prompt queries
export const PROMPT_ACCEPTED_PARAMS: WhereParam[] = [
  { key: "objectId", type: WhereParamTypes.STRING },
  { key: "creator", type: WhereParamTypes.STRING },
  { key: "timestamp", type: WhereParamTypes.DATE },
];

/**
 * A helper to prepare pagination based on `req.query`.
 * We are doing only primary key cursor + ordering for this example.
 */
export const parsePaginationForQuery = (body: Record<string, any>): ApiPagination => {
  const pagination: ApiPagination = {
    orderBy: {
      id:
        Object.hasOwn(body, "sort") && ["asc", "desc"].includes(body.sort)
          ? body.sort
          : "desc",
    },
  };

  // Prepare pagination limit (how many items to return)
  if (Object.hasOwn(body, "limit")) {
    const requestLimit = Number(body.limit);

    if (isNaN(requestLimit)) throw new Error("Invalid limit value");

    pagination.take =
      requestLimit > CONFIG.DEFAULT_LIMIT ? CONFIG.DEFAULT_LIMIT : requestLimit;
  } else {
    pagination.take = CONFIG.DEFAULT_LIMIT;
  }

  // Prepare cursor pagination (which page to return)
  if (Object.hasOwn(body, "cursor")) {
    const cursor = Number(body.cursor);
    if (isNaN(cursor)) throw new Error("Invalid cursor");
    pagination.skip = 1;
    pagination.cursor = {
      id: cursor,
    };
  }

  return pagination;
};

/** Parses a where statement based on the query params. */
export const parseWhereStatement = (
  query: Record<string, any>,
  acceptedParams: WhereParam[]
): Record<string, any> => {
  const params: Record<string, any> = {};
  for (const key of Object.keys(query)) {
    const whereParam = acceptedParams.find((x) => x.key === key);
    if (!whereParam) continue;

    const value = query[key];
    if (whereParam.type === WhereParamTypes.STRING) {
      params[key] = value;
    }
    if (whereParam.type === WhereParamTypes.NUMBER) {
      const number = Number(value);
      if (isNaN(number)) throw new Error(`Invalid number for ${key}`);

      params[key] = number;
    }

    // Handle boolean expected values.
    if (whereParam.type === WhereParamTypes.BOOLEAN) {
      let boolValue;
      if (value === "true") boolValue = true;
      else if (value === "false") boolValue = false;
      else throw new Error(`Invalid boolean for ${key}`);

      params[key] = boolValue;
    }

    // Handle date values
    if (whereParam.type === WhereParamTypes.DATE) {
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) throw new Error(`Invalid date for ${key}`);
        params[key] = date;
      } catch (e) {
        throw new Error(`Invalid date format for ${key}`);
      }
    }
  }
  return params;
};

export const getResponseCursor = (results: any[]): number | undefined => {
  return results.length > 0 ? results[results.length - 1]?.id : undefined;
};

/**
 * Helper to format a paginated response.
 * Assumes `id` as the primary key that we're using the cursor against.
 */
export const formatPaginatedResponse = (data: any[]) => {
  return {
    data,
    cursor: getResponseCursor(data),
  };
};

/**
 * Helper to query prompts with filters
 */
export const getPromptsWithFilters = async (
  prisma: any,
  where: Record<string, any>,
  pagination: ApiPagination
) => {
  return prisma.prompt.findMany({
    where,
    orderBy: pagination.orderBy || { id: "desc" },
    take: pagination.take,
    skip: pagination.skip,
    cursor: pagination.cursor,
  });
};

/**
 * Helper to get a prompt by objectId
 */
export const getPromptByObjectId = async (prisma: any, objectId: string) => {
  return prisma.prompt.findUnique({
    where: { objectId },
  });
};

/**
 * Helper to get latest prompts
 */
export const getLatestPrompts = async (
  prisma: any,
  pagination: ApiPagination
) => {
  return prisma.prompt.findMany({
    orderBy: { timestamp: "desc" },
    take: pagination?.take || CONFIG.DEFAULT_LIMIT,
    cursor: pagination?.cursor,
    skip: pagination?.skip,
  });
};

/**
 * Helper to get prompts by creator
 */
export const getPromptsByCreator = async (
  prisma: any,
  creator: string,
  pagination: ApiPagination
) => {
  return prisma.prompt.findMany({
    where: { creator },
    orderBy: pagination.orderBy || { timestamp: "desc" },
    take: pagination.take || CONFIG.DEFAULT_LIMIT,
    cursor: pagination.cursor,
    skip: pagination.skip,
  });
};