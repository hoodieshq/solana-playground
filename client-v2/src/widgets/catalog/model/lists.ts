import type { CardOpen, CatalogList } from "../ui/BaseCatalogGrid";

/** A list's size, or where reading it stands */
export type ListCount = number | "loading" | "failed";

/** A card's Open, by its id: `useCardOpen`'s `cardOpen` */
export type CardOpenOf = (id: string) => CardOpen | undefined;

/** One list of the catalog: the cards for a query, and how many there are */
export interface CardList {
  list: CatalogList;
  count: ListCount;
}
