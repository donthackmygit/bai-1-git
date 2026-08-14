import { useEffect, useMemo, useState } from 'react';

type SearchHit = {
  objectID: string;
  name: string;
  description: string;
  categories: string[];
  image: string;
  price: number;
  rating: number;
  brand?: string;
  free_shipping: boolean;
};

type SearchResponse = {
  hits: SearchHit[];
  nbHits: number;
  nbPages: number;
  page: number;
  facets?: Record<string, Record<string, number>>;
};

const APP_ID = 'latency';
const SEARCH_KEY = '6be0576ff61c053d5f9a3225e2a90f76';
const INDEX_NAME = 'instant_search';
const SEARCH_URL = `https://${APP_ID}-dsn.algolia.net/1/indexes/${INDEX_NAME}/query`;
const PRICE_LIMIT = 3000;

const fallbackHits: SearchHit[] = [
  { objectID: '5477500', name: 'Amazon - Fire TV Stick with Alexa Voice Remote - Black', description: 'Enjoy smart access to videos, games and apps with this Amazon Fire TV stick. Its Alexa voice remote lets you deliver hands-free commands.', categories: ['TV & Home Theater', 'Streaming Media Players'], image: 'https://cdn-demo.algolia.com/bestbuy-0118/5477500_sb.jpg', price: 39.99, rating: 4, free_shipping: false },
  { objectID: '4901809', name: 'Apple - AirPods with Charging Case - White', description: 'AirPods deliver an unparalleled wireless headphone experience, from listening to music to answering calls.', categories: ['Audio', 'Headphones'], image: 'https://cdn-demo.algolia.com/bestbuy-0118/4901809_sb.jpg', price: 159.99, rating: 4.7, free_shipping: true },
  { objectID: '6325758', name: 'Samsung - 55 Class QLED Q60 Series LED 4K UHD Smart Tizen TV', description: 'Experience vibrant color and sharp detail in every scene with this immersive 4K television.', categories: ['TV & Home Theater', 'TVs'], image: 'https://cdn-demo.algolia.com/bestbuy-0118/6325758_sb.jpg', price: 899.99, rating: 4.6, free_shipping: true },
  { objectID: '6301221', name: 'Sony - WH-1000XM3 Wireless Noise Canceling Headphones', description: 'Industry-leading noise cancellation, premium sound and all-day listening comfort.', categories: ['Audio', 'Headphones'], image: 'https://cdn-demo.algolia.com/bestbuy-0118/6301221_sb.jpg', price: 349.99, rating: 4.8, free_shipping: true },
];

function readInitialState() {
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get('query') ?? '',
    freeShipping: params.get('free_shipping') === 'true',
    category: params.get('category') ?? '',
    brand: params.get('brand') ?? '',
    rating: Number(params.get('rating') ?? 0),
    maxPrice: Number(params.get('max_price') ?? PRICE_LIMIT),
    sort: params.get('sort') ?? 'featured',
    hitsPerPage: Number(params.get('hits_per_page') ?? 16),
    page: Math.max(0, Number(params.get('page') ?? 0)),
  };
}

function SearchIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><g fill="none" fillRule="evenodd" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.67" transform="translate(1 1)"><circle cx="7.11" cy="7.11" r="7.11" /><path d="m16 16-3.87-3.87" /></g></svg>;
}

function Star({ small = false }: { small?: boolean }) {
  return <svg className={small ? 'rating-star-small' : 'rating-star'} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true"><path d="m10.472 5.008 5.528.808-4 3.896.944 5.504L8 12.616l-4.944 2.6L4 9.712 0 5.816l5.528-.808L8 0z" /></svg>;
}

function AlgoliaLogo() {
  return <div className="header-logo" aria-label="Algolia"><svg viewBox="0 0 370 84" role="img" aria-label="algolia"><path fill="#fff" d="M42 0a42 42 0 1 0 20.1 78.9l-4-3.6a2.8 2.8 0 0 0-3-.5 33.9 33.9 0 1 1-13.1-65.9h34v60.8L56.7 52.5a1.5 1.5 0 0 0-2.2.2 15.9 15.9 0 1 1 3.2-10.9 3 3 0 0 0 1 2l5.1 4.5c.6.5 1.5.2 1.7-.6A24 24 0 0 0 42 18.2 24 24 0 0 0 18.1 42a24.2 24.2 0 0 0 23.4 24.6 23.9 23.9 0 0 0 14.7-4.6L81.8 84c1.1 1 2.9.2 2.9-1.3V1.6A1.6 1.6 0 0 0 83.1 0H42Z" /><text x="100" y="59" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontSize="58" fontWeight="700" letterSpacing="-3">algolia</text></svg></div>;
}

function highlight(text: string, query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return text;
  const words = cleanQuery.split(/\s+/).filter(Boolean).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return text;
  const parts = text.split(new RegExp(`(${words.join('|')})`, 'ig'));
  return parts.map((part, index) => new RegExp(`^${words.join('|')}$`, 'i').test(part) ? <mark key={`${part}-${index}`}>{part}</mark> : part);
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(price);
}

function App() {
  const initial = useMemo(readInitialState, []);
  const [query, setQuery] = useState(initial.query);
  const [freeShipping, setFreeShipping] = useState(initial.freeShipping);
  const [category, setCategory] = useState(initial.category);
  const [brand, setBrand] = useState(initial.brand);
  const [brandSearch, setBrandSearch] = useState('');
  const [rating, setRating] = useState(initial.rating);
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice);
  const [sort, setSort] = useState(initial.sort);
  const [hitsPerPage, setHitsPerPage] = useState(initial.hitsPerPage);
  const [page, setPage] = useState(initial.page);
  const [results, setResults] = useState<SearchResponse>({ hits: fallbackHits, nbHits: 10000, nbPages: 1, page: 0, facets: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [hasApiError, setHasApiError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categories = useMemo(() => Object.entries(results.facets?.['hierarchicalCategories.lvl0'] ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 9), [results.facets]);
  const brands = useMemo(() => Object.entries(results.facets?.brand ?? {}).filter(([name]) => name.toLowerCase().includes(brandSearch.toLowerCase())).sort((a, b) => b[1] - a[1]).slice(0, 10), [results.facets, brandSearch]);
  const activePage = Math.min(page, Math.max(0, results.nbPages - 1));
  const hasFilters = Boolean(query || freeShipping || category || brand || rating || maxPrice < PRICE_LIMIT);

  useEffect(() => setPage(0), [query, freeShipping, category, brand, rating, maxPrice, sort, hitsPerPage]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (freeShipping) params.set('free_shipping', 'true');
    if (category) params.set('category', category);
    if (brand) params.set('brand', brand);
    if (rating) params.set('rating', String(rating));
    if (maxPrice < PRICE_LIMIT) params.set('max_price', String(maxPrice));
    if (sort !== 'featured') params.set('sort', sort);
    if (hitsPerPage !== 16) params.set('hits_per_page', String(hitsPerPage));
    if (activePage) params.set('page', String(activePage));
    window.history.replaceState({}, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
  }, [query, freeShipping, category, brand, rating, maxPrice, sort, hitsPerPage, activePage]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      const facetFilters: string[] = [];
      if (freeShipping) facetFilters.push('free_shipping:true');
      if (category) facetFilters.push(`hierarchicalCategories.lvl0:${category}`);
      if (brand) facetFilters.push(`brand:${brand}`);
      const numericFilters: string[] = [];
      if (rating) numericFilters.push(`rating>=${rating}`);
      if (maxPrice < PRICE_LIMIT) numericFilters.push(`price<=${maxPrice}`);
      const searchParams = new URLSearchParams({
        query,
        page: String(page),
        hitsPerPage: String(hitsPerPage),
        attributesToSnippet: 'description:10',
        snippetEllipsisText: '…',
        removeWordsIfNoResults: 'allOptional',
        facets: 'brand,free_shipping,hierarchicalCategories.lvl0',
        maxValuesPerFacet: '12',
      });
      if (facetFilters.length) searchParams.set('facetFilters', JSON.stringify(facetFilters));
      if (numericFilters.length) searchParams.set('numericFilters', JSON.stringify(numericFilters));
      try {
        const response = await fetch(SEARCH_URL, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', 'x-algolia-application-id': APP_ID, 'x-algolia-api-key': SEARCH_KEY }, body: JSON.stringify({ params: searchParams.toString() }) });
        if (!response.ok) throw new Error('Search request failed');
        const data = await response.json() as SearchResponse;
        const sortedHits = [...data.hits].sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : 0);
        setResults({ ...data, hits: sortedHits });
        setHasApiError(false);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') { setHasApiError(true); setResults((current) => ({ ...current, hits: current.hits.length ? current.hits : fallbackHits })); }
      } finally { if (!controller.signal.aborted) setIsLoading(false); }
    }, 120);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query, freeShipping, category, brand, rating, maxPrice, sort, hitsPerPage, page]);

  const clearFilters = () => { setQuery(''); setFreeShipping(false); setCategory(''); setBrand(''); setRating(0); setMaxPrice(PRICE_LIMIT); setPage(0); };
  const pageNumbers = Array.from({ length: Math.min(results.nbPages, 5) }, (_, index) => Math.max(0, Math.min(activePage - 2, results.nbPages - 5)) + index).filter((item) => item < results.nbPages);

  const filters = <section className="container-filters">
    <div className="container-header"><h2>Filters</h2><button className="clear-filters" onClick={clearFilters} disabled={!hasFilters}><span aria-hidden="true">×</span> Clear filters</button></div>
    <div className="container-body">
      <section className="ais-Panel"><h3>Category</h3><ul className="ais-HierarchicalMenu-list">{categories.map(([name, count]) => <li className={`ais-HierarchicalMenu-item ${category === name ? 'is-selected' : ''}`} key={name}><button onClick={() => setCategory(category === name ? '' : name)}><i /> <span>{name}</span><small>{count.toLocaleString()}</small></button></li>)}</ul></section>
      <section className="ais-Panel"><h3>Brands</h3><div className="brand-search"><input value={brandSearch} onChange={(event) => setBrandSearch(event.target.value)} placeholder="Search for brands…" /><SearchIcon /></div><ul className="ais-RefinementList-list">{brands.map(([name, count]) => <li className={`ais-RefinementList-item ${brand === name ? 'is-selected' : ''}`} key={name}><label><input type="checkbox" checked={brand === name} onChange={() => setBrand(brand === name ? '' : name)} /><span>{name}</span><small>{count.toLocaleString()}</small></label></li>)}</ul></section>
      <section className="ais-Panel"><h3>Price</h3><div className="price-slider"><input aria-label="Maximum price" type="range" min="0" max={PRICE_LIMIT} step="10" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /><div><strong>$0</strong><strong>${maxPrice.toLocaleString()}</strong></div></div></section>
      <section className="ais-Panel"><h3>Free shipping</h3><label className="shipping-toggle"><input type="checkbox" checked={freeShipping} onChange={(event) => setFreeShipping(event.target.checked)} /><span>Display only items with free shipping</span></label></section>
      <section className="ais-Panel"><h3>Ratings</h3><ul className="ratings">{[4, 3, 2, 1].map((value) => <li className={rating === value ? 'is-selected' : ''} key={value}><button onClick={() => setRating(rating === value ? 0 : value)}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} small />)}<span>& Up</span></button></li>)}</ul></section>
    </div>
    <div className="mobile-filter-actions"><button onClick={clearFilters}>Clear filters</button><button onClick={() => setFiltersOpen(false)}>Save filters</button></div>
  </section>;

  return <div className={filtersOpen ? 'app filtering' : 'app'}>
    <header className="header"><AlgoliaLogo /><p className="header-title">Stop looking for an item — find it.</p><div className="ais-SearchBox"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Product, brand, color, …" aria-label="Search products" />{query && <button onClick={() => setQuery('')} aria-label="Clear search">×</button>}</div></header>
    <main className="container"><div className="container-wrapper">{filters}</div><section className="container-results"><header className="container-header container-options"><label><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Sort by featured</option><option value="price-asc">Price ascending</option><option value="price-desc">Price descending</option></select></label><label><select value={hitsPerPage} onChange={(event) => setHitsPerPage(Number(event.target.value))}><option value={16}>16 hits per page</option><option value={32}>32 hits per page</option><option value={64}>64 hits per page</option></select></label></header>
      {isLoading && <div className="loading-line" />}
      {hasApiError && <p className="api-note">Showing a local fallback while the demo search service reconnects.</p>}
      {results.hits.length ? <div className="ais-Hits-list">{results.hits.map((hit) => <article className="hit" key={hit.objectID}><header className="hit-image-container"><img src={hit.image} alt={hit.name} className="hit-image" /></header><div className="hit-info-container"><p className="hit-category">{hit.categories?.[0] ?? 'Product'}</p><h1>{highlight(hit.name, query)}</h1><p className="hit-description">{highlight(hit.description?.slice(0, 135) ?? '', query)}{hit.description?.length > 135 ? '…' : ''}</p><footer><p><span className="hit-em">$</span> <strong>{formatPrice(hit.price)}</strong> <span className="hit-em hit-rating"><Star /> {hit.rating}</span></p></footer></div></article>)}</div> : <div className="hits-empty-state"><div>⌕</div><h2>No results</h2><p>We couldn’t find any products matching your search.</p><button onClick={clearFilters}>Clear filters</button></div>}
      {results.nbPages > 1 && <footer className="container-footer"><nav className="ais-Pagination-list" aria-label="Pagination"><button onClick={() => setPage(Math.max(0, activePage - 1))} disabled={!activePage}>‹</button>{pageNumbers.map((number) => <button key={number} onClick={() => setPage(number)} className={number === activePage ? 'is-selected' : ''}>{number + 1}</button>)}<button onClick={() => setPage(Math.min(results.nbPages - 1, activePage + 1))} disabled={activePage >= results.nbPages - 1}>›</button></nav></footer>}
    </section></main>
    <button className="filters-button" onClick={() => setFiltersOpen(true)}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 14" aria-hidden="true"><path d="M15 1H1l5.6 6.3v4.37L9.4 13V7.3z" stroke="currentColor" strokeWidth="1.29" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>Filters</button>
  </div>;
}

export default App;
