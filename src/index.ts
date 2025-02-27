import GQLResultInterface, {
  GQLEdgeInterface,
  GQLNodeInterface,
} from "./faces";
import axios from "axios";
import txQuery from "./queries/tx";

let GQL_ENDPOINT = "https://arweave.net/graphql" //default
export const setEndpointUrl = (full_GQL_Url: string) => GQL_ENDPOINT = full_GQL_Url

export const run = async (
  query: string,
  variables?: Record<string, unknown>,
  gqlUrl?: string,
): Promise<GQLResultInterface> => {
  const graphql = JSON.stringify({
    query,
    variables,
  });

  const { data: res } = await axios.post(
    gqlUrl || GQL_ENDPOINT,
    graphql,
    {
      headers: {
        "content-type": "application/json",
      },
    }
  );

  return res;
};

export const all = async (
  query: string,
  variables?: Record<string, unknown>,
  gqlUrl?: string,
): Promise<GQLEdgeInterface[]> => {
  let hasNextPage = true;
  let edges: GQLEdgeInterface[] = [];
  let cursor: string = "";

  while (hasNextPage) {
    const res = (
      await run(
        query, 
        { ...variables, cursor },
        gqlUrl,
      )
    ).data.transactions;

    if (res.edges && res.edges.length) {
      edges = edges.concat(res.edges);
      cursor = res.edges[res.edges.length - 1].cursor;
    }
    hasNextPage = res.pageInfo.hasNextPage;
  }

  return edges;
};

export const tx = async (id: string, gqlUrl?: string): Promise<GQLNodeInterface> => {
  const isBrowser: boolean = typeof window !== "undefined";

  if (isBrowser) {
    const cache = JSON.parse(localStorage.getItem("gqlCache") || "{}");
    if (id in cache) return JSON.parse(cache[id]);
  }

  const res = await run(txQuery, { id }, gqlUrl);

  if (isBrowser && res.data.transaction.block) {
    const cache = JSON.parse(localStorage.getItem("gqlCache") || "{}");
    cache[id] = res.data.transaction;
    localStorage.setItem("gqlCache", JSON.stringify(cache));
  }

  return res.data.transaction;
};

export const fetchTxTag = async (
  id: string,
  name: string,
  gqlUrl?: string
): Promise<string | undefined> => {
  const res = await tx(id, gqlUrl);

  const tag = res.tags.find((tag) => tag.name === name);
  if (tag) return tag.value;
};
