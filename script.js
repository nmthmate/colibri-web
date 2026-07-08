const state = {
  heroSlides: [],
  products: [],
  deals: [],
  activeSlide: 0,
  activeCategory: "all",
  activePriceRange: "all",
  drsOnly: false,
  visibleCount: 50,
  timer: null,
};

const hero = document.getElementById("hero");
const heroTitle = document.getElementById("heroTitle");
const heroSubtitle = document.getElementById("heroSubtitle");
const heroPrev = document.getElementById("heroPrev");
const heroNext = document.getElementById("heroNext");
const heroCatalogBtn = document.getElementById("heroCatalogBtn");
const ageGate = document.getElementById("ageGate");
const ageConfirmBtn = document.getElementById("ageConfirmBtn");
const ageRejectBtn = document.getElementById("ageRejectBtn");
const productGrid = document.getElementById("productGrid");
const dealStrip = document.getElementById("dealStrip");
const productSearch = document.getElementById("productSearch");
const productCount = document.getElementById("productCount");
const categoryFilters = document.getElementById("categoryFilters");
const loadMoreProductsBtn = document.getElementById("loadMoreProductsBtn");
const priceFilter = document.getElementById("priceFilter");
const depositOnlyInput = document.getElementById("depositOnly");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const productModal = document.getElementById("productModal");
const productModalClose = document.getElementById("productModalClose");
const productModalImage = document.getElementById("productModalImage");
const productModalTitle = document.getElementById("productModalTitle");
const productModalPrice = document.getElementById("productModalPrice");

const DEFAULT_PRODUCTS_LIMIT = 50;
const SEARCH_DEBOUNCE_MS = 130;
const NAME_COLLATOR = new Intl.Collator("hu", {
  sensitivity: "base",
  ignorePunctuation: true,
  numeric: true,
});
const DRS_ELIGIBLE_CATEGORIES = new Set([
  "sör",
  "cider",
  "üdítő",
  "energiaital",
  "gyümölcslé",
  "jegestea",
  "szörp",
  "ásványvíz",
  "bor",
  "pezsgő",
  "whisky",
  "vodka",
  "gin",
  "rum",
  "tequila",
  "likőr",
  "pálinka",
  "vermut",
  "brandy",
  "rövidital",
  "abszint",
]);

function renderStatus(container, message, isError = false) {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  const status = document.createElement("p");
  status.className = isError ? "data-status error" : "data-status";
  status.textContent = message;
  container.appendChild(status);
}

function sortProductsByName(products) {
  return [...products].sort((first, second) => {
    const firstName = String(first?.name || "").trim();
    const secondName = String(second?.name || "").trim();
    const byName = NAME_COLLATOR.compare(firstName, secondName);

    if (byName !== 0) {
      return byName;
    }

    const firstCategory = String(first?.category || "").trim();
    const secondCategory = String(second?.category || "").trim();
    return NAME_COLLATOR.compare(firstCategory, secondCategory);
  });
}

function normalizeForSearch(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function enrichProduct(product) {
  const name = String(product?.name || "");
  const category = String(product?.category || "");
  const normalizedName = normalizeForSearch(name);
  const normalizedCategory = normalizeForSearch(category);
  const searchText = `${normalizedName} ${normalizedCategory}`.trim();
  const searchWords = searchText.split(/[^a-z0-9]+/).filter((word) => word.length > 1);

  return {
    ...product,
    _normalizedName: normalizedName,
    _normalizedCategory: normalizedCategory,
    _searchText: searchText,
    _searchWords: searchWords,
    _priceValue: parsePriceValue(product?.price),
  };
}

function normalizeCategory(category) {
  return String(category || "").trim().toLowerCase();
}

function isDrsEligibleCategory(category) {
  return DRS_ELIGIBLE_CATEGORIES.has(normalizeCategory(category));
}

function tokenizeName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter((token) => token.length > 0);
}

function getNormalizedName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasDrsPackage(name) {
  const tokens = tokenizeName(name);
  return tokens.some(
    (token) =>
      token === "can" ||
      token === "pet" ||
      token === "pal" ||
      token === "pal." ||
      token.startsWith("palack") ||
      token === "dob" ||
      token === "dob." ||
      token.startsWith("doboz") ||
      token === "uveg" ||
      token.startsWith("uveges")
  );
}

function hasGlassPackage(name) {
  const tokens = tokenizeName(name);
  return tokens.some(
    (token) =>
      token === "pal" || token === "pal." || token.startsWith("palack") || token === "uveg" || token.startsWith("uveges")
  );
}

function hasVolumeMarker(name) {
  const normalized = getNormalizedName(name);
  return /\b\d+(?:[.,]\d+)?\s*(?:l|ml)\b/.test(normalized);
}

function getDepositAmount(product) {
  const category = normalizeCategory(product?.category);
  if (!isDrsEligibleCategory(category)) {
    return null;
  }

  const name = String(product?.name || "");
  const depositByData = product?.deposit === true;
  const depositByPackage = hasDrsPackage(name);
  const depositByVolume = hasVolumeMarker(name);

  if (!depositByData && !depositByPackage && !depositByVolume) {
    return null;
  }

  const isBeerOrCider = category === "sör" || category === "cider";
  if (isBeerOrCider && hasGlassPackage(name)) {
    return 25;
  }

  return 50;
}

function hasAnyActiveProductFilter() {
  const query = productSearch ? productSearch.value.trim() : "";
  return (
    query.length > 0 ||
    state.activeCategory !== "all" ||
    state.activePriceRange !== "all" ||
    state.drsOnly
  );
}

function updateProductCount(visibleCount, filteredCount, totalCount = state.products.length) {
  if (!productCount) {
    return;
  }

  const hasFilter = hasAnyActiveProductFilter();
  const isLimited = filteredCount > visibleCount;

  if (hasFilter || isLimited) {
    productCount.textContent = `${visibleCount} / ${filteredCount} termék`;
    return;
  }

  productCount.textContent = `${totalCount} termék`;
}

function updateLoadMoreButton(filteredCount) {
  if (!loadMoreProductsBtn) {
    return;
  }

  const remaining = filteredCount - state.visibleCount;
  const shouldShow = remaining > 0;
  loadMoreProductsBtn.hidden = !shouldShow;

  if (shouldShow) {
    const nextBatch = Math.min(DEFAULT_PRODUCTS_LIMIT, remaining);
    loadMoreProductsBtn.textContent = `További ${nextBatch} termék (${state.visibleCount}/${filteredCount})`;
  }
}

function renderProducts(products) {
  if (!productGrid) {
    return;
  }

  if (!products.length) {
    renderStatus(productGrid, "Nincs találat a beállított szűrőre.");
    updateProductCount(0, 0, state.products.length);
    updateLoadMoreButton(0);
    return;
  }

  const visibleLimit = Math.min(state.visibleCount, products.length);
  const visibleProducts = products.slice(0, visibleLimit);

  productGrid.innerHTML = "";

  visibleProducts.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card is-clickable";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${product.name || "Termék"} részletei`);

    const openFromCard = () => {
      openProductModal(product);
    };
    card.addEventListener("click", openFromCard);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      openFromCard();
    });

    const title = document.createElement("h3");
    title.textContent = product.name || "Névtelen termék";

    const meta = document.createElement("div");
    meta.className = "product-meta";

    const category = document.createElement("p");
    category.className = "product-category";
    category.textContent = product.category || "Kategória nélkül";

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = product.price || "Ár érdeklődjön";

    meta.append(category, price);

    card.append(title, meta);

    const depositAmount = getDepositAmount(product);
    if (depositAmount !== null) {
      const depositTag = document.createElement("p");
      depositTag.className = "product-deposit-tag";
      if (depositAmount === 25) {
        depositTag.classList.add("is-25");
      }
      depositTag.textContent = `DRS +${depositAmount} Ft betétdíj`;
      card.appendChild(depositTag);
    }

    productGrid.appendChild(card);
  });

  updateProductCount(visibleProducts.length, products.length, state.products.length);
  updateLoadMoreButton(products.length);
}

function getSortedCategories(products) {
  const categories = products
    .map((product) => (product.category || "").trim())
    .filter((category) => category.length > 0);
  const unique = [...new Set(categories)];
  return unique.sort((a, b) => a.localeCompare(b, "hu"));
}

function updateActiveCategoryChip() {
  if (!categoryFilters) {
    return;
  }

  const chips = categoryFilters.querySelectorAll(".filter-chip");
  chips.forEach((chip) => {
    const isActive = chip.dataset.category === state.activeCategory;
    chip.classList.toggle("active", isActive);
    chip.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderCategoryFilters(products) {
  if (!categoryFilters) {
    return;
  }

  const categories = getSortedCategories(products);
  categoryFilters.innerHTML = "";

  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = "filter-chip";
  allChip.dataset.category = "all";
  allChip.textContent = "Összes";
  categoryFilters.appendChild(allChip);

  categories.forEach((category) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "filter-chip";
    chip.dataset.category = category;
    chip.textContent = category;
    categoryFilters.appendChild(chip);
  });

  updateActiveCategoryChip();
}

function getHeroFilterText(slide) {
  const title = (slide?.title || "").toLowerCase();

  if (title.includes("sör")) {
    return "sör";
  }

  if (title.includes("rövidital")) {
    return "whisky vodka gin rum pálinka tequila likőr";
  }

  if (title.includes("bor") || title.includes("pezsg")) {
    return "bor pezsgő";
  }

  return "";
}

function renderDeals(deals) {
  if (!dealStrip) {
    return;
  }

  if (!deals.length) {
    renderStatus(dealStrip, "Jelenleg nincs feltöltött akció.");
    return;
  }

  dealStrip.innerHTML = "";

  deals.forEach((deal, index) => {
    const card = document.createElement("article");
    card.className = "deal-card";
    const fallbackTones = ["amber", "lime", "mint"];
    card.dataset.tone = deal.tone || fallbackTones[index % fallbackTones.length];

    const head = document.createElement("div");
    head.className = "deal-head";

    const tag = document.createElement("p");
    tag.className = "deal-tag";
    tag.textContent = deal.tag || "AJÁNLAT";

    const type = document.createElement("p");
    type.className = "deal-type";
    type.textContent = deal.type || "Boltban elérhető";

    const title = document.createElement("h3");
    title.textContent = deal.title || "Aktuális ajánlat";

    const description = document.createElement("p");
    description.className = "deal-description";
    description.textContent = deal.description || "Részletek az üzletben.";

    const meta = document.createElement("ul");
    meta.className = "deal-meta";

    const validity = document.createElement("li");
    const validityLabel = document.createElement("span");
    validityLabel.textContent = "Érvényesség";
    const validityValue = document.createElement("strong");
    validityValue.textContent = deal.validity || "A készlet erejéig";
    validity.append(validityLabel, validityValue);

    const condition = document.createElement("li");
    const conditionLabel = document.createElement("span");
    conditionLabel.textContent = "Feltétel";
    const conditionValue = document.createElement("strong");
    conditionValue.textContent = deal.condition || "Részletek a pénztárnál";
    condition.append(conditionLabel, conditionValue);

    const footer = document.createElement("div");
    footer.className = "deal-footer";

    const note = document.createElement("p");
    note.className = "deal-note";
    note.textContent = deal.note || "Az akció részleteiről érdeklődj üzletünkben.";

    const cta = document.createElement("a");
    cta.className = "deal-cta";
    cta.href = "#kapcsolat";
    cta.textContent = "Érdekel";

    head.append(tag, type);
    meta.append(validity, condition);
    footer.append(note, cta);

    card.append(head, title, description, meta, footer);
    dealStrip.appendChild(card);
  });
}

function parsePriceValue(priceText) {
  const numeric = Number(String(priceText || "").replace(/[^\d]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function matchesPriceRange(priceValue, range) {
  if (range === "all") {
    return true;
  }

  if (range === "0-999") {
    return priceValue >= 0 && priceValue <= 999;
  }

  if (range === "1000-2999") {
    return priceValue >= 1000 && priceValue <= 2999;
  }

  if (range === "3000-4999") {
    return priceValue >= 3000 && priceValue <= 4999;
  }

  if (range === "5000+") {
    return priceValue >= 5000;
  }

  return true;
}

function isWithinOneEdit(first, second) {
  const firstLength = first.length;
  const secondLength = second.length;
  if (Math.abs(firstLength - secondLength) > 1) {
    return false;
  }

  let pointerA = 0;
  let pointerB = 0;
  let edits = 0;

  while (pointerA < firstLength && pointerB < secondLength) {
    if (first[pointerA] === second[pointerB]) {
      pointerA += 1;
      pointerB += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) {
      return false;
    }

    if (firstLength > secondLength) {
      pointerA += 1;
    } else if (firstLength < secondLength) {
      pointerB += 1;
    } else {
      pointerA += 1;
      pointerB += 1;
    }
  }

  if (pointerA < firstLength || pointerB < secondLength) {
    edits += 1;
  }

  return edits <= 1;
}

function matchesSearchQuery(product, queryParts) {
  if (!queryParts.length) {
    return true;
  }

  const searchText = product?._searchText || "";
  const searchWords = Array.isArray(product?._searchWords) ? product._searchWords : [];

  return queryParts.every((part) => {
    if (searchText.includes(part)) {
      return true;
    }

    if (part.length < 4 || !searchWords.length) {
      return false;
    }

    return searchWords.some((word) => {
      if (!word || Math.abs(word.length - part.length) > 1) {
        return false;
      }
      if (word.startsWith(part) || part.startsWith(word)) {
        return true;
      }
      return isWithinOneEdit(word, part);
    });
  });
}

function applyProductFilters(resetVisible = false) {
  const query = normalizeForSearch(productSearch ? productSearch.value : "");
  const queryParts = query.split(/\s+/).filter((part) => part.length > 0);

  const filtered = state.products.filter((product) => {
    const category = product?._normalizedCategory || normalizeForSearch(product?.category);
    const matchesCategory =
      state.activeCategory === "all" || category === normalizeForSearch(state.activeCategory);
    const matchesPrice = matchesPriceRange(product?._priceValue || 0, state.activePriceRange);
    const matchesDeposit = !state.drsOnly || getDepositAmount(product) !== null;
    const matchesQuery = matchesSearchQuery(product, queryParts);
    return matchesCategory && matchesPrice && matchesDeposit && matchesQuery;
  });

  if (resetVisible) {
    state.visibleCount = DEFAULT_PRODUCTS_LIMIT;
  } else {
    state.visibleCount = Math.min(Math.max(state.visibleCount, DEFAULT_PRODUCTS_LIMIT), filtered.length || DEFAULT_PRODUCTS_LIMIT);
  }

  renderProducts(filtered);
}

function setupCategoryFilters() {
  if (!categoryFilters) {
    return;
  }

  categoryFilters.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const chip = target.closest(".filter-chip");
    if (!(chip instanceof HTMLButtonElement)) {
      return;
    }

    const selectedCategory = chip.dataset.category || "all";
    state.activeCategory = selectedCategory;
    updateActiveCategoryChip();
    applyProductFilters(true);
  });
}

function setupHeroCatalogFilter() {
  if (!heroCatalogBtn) {
    return;
  }

  heroCatalogBtn.addEventListener("click", () => {
    const activeSlide = state.heroSlides[state.activeSlide];
    const filterText = getHeroFilterText(activeSlide);

    if (!productSearch || !filterText) {
      return;
    }

    productSearch.value = filterText;
    state.activeCategory = "all";
    state.activePriceRange = "all";
    state.drsOnly = false;
    if (priceFilter) {
      priceFilter.value = "all";
    }
    if (depositOnlyInput) {
      depositOnlyInput.checked = false;
    }
    updateActiveCategoryChip();
    applyProductFilters(true);
  });
}

function setupLoadMoreProducts() {
  if (!loadMoreProductsBtn) {
    return;
  }

  loadMoreProductsBtn.addEventListener("click", () => {
    state.visibleCount += DEFAULT_PRODUCTS_LIMIT;
    applyProductFilters(false);
  });
}

function setupAdvancedFilters() {
  if (priceFilter) {
    priceFilter.addEventListener("change", () => {
      state.activePriceRange = priceFilter.value || "all";
      applyProductFilters(true);
    });
  }

  if (depositOnlyInput) {
    depositOnlyInput.addEventListener("change", () => {
      state.drsOnly = Boolean(depositOnlyInput.checked);
      applyProductFilters(true);
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      state.activeCategory = "all";
      state.activePriceRange = "all";
      state.drsOnly = false;
      if (productSearch) {
        productSearch.value = "";
      }
      if (priceFilter) {
        priceFilter.value = "all";
      }
      if (depositOnlyInput) {
        depositOnlyInput.checked = false;
      }
      updateActiveCategoryChip();
      applyProductFilters(true);
    });
  }
}

function debounce(handler, waitMs = SEARCH_DEBOUNCE_MS) {
  let timeoutId = null;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => handler(...args), waitMs);
  };
}

function openProductModal(product) {
  if (!productModal || !productModalTitle || !productModalPrice) {
    return;
  }

  productModalTitle.textContent = product?.name || "Névtelen termék";
  productModalPrice.textContent = product?.price || "Ár érdeklődjön";

  if (productModalImage) {
    const rawImageSrc = String(product?.image || "").trim();
    const imageCandidates = [];

    if (rawImageSrc) {
      if (rawImageSrc.includes("/")) {
        imageCandidates.push(rawImageSrc);
      } else {
        imageCandidates.push(`termekek/${rawImageSrc}`);
        imageCandidates.push(rawImageSrc);
      }
    }

    imageCandidates.push("logo.jpeg");

    let imageIndex = 0;
    const setCurrentImage = () => {
      const currentImage = imageCandidates[imageIndex] || "logo.jpeg";
      productModalImage.src = currentImage;
      productModalImage.alt =
        currentImage === "logo.jpeg"
          ? `Colibri logó - ${product?.name || "termék"}`
          : `${product?.name || "Termék"} képe`;
    };

    productModalImage.onerror = () => {
      imageIndex += 1;
      if (imageIndex >= imageCandidates.length) {
        productModalImage.onerror = null;
        return;
      }
      setCurrentImage();
    };

    setCurrentImage();
  }

  productModal.hidden = false;
  document.body.classList.add("lock-scroll");
}

function closeProductModal() {
  if (!productModal) {
    return;
  }

  productModal.hidden = true;
  if (!ageGate || ageGate.hidden) {
    document.body.classList.remove("lock-scroll");
  }
}

function setupProductModal() {
  if (!productModal || !productModalClose) {
    return;
  }

  productModalClose.addEventListener("click", closeProductModal);

  productModal.addEventListener("click", (event) => {
    if (event.target !== productModal) {
      return;
    }
    closeProductModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProductModal();
    }
  });
}

function setupAgeGate() {
  if (!ageGate || !ageConfirmBtn || !ageRejectBtn) {
    return;
  }

  document.body.classList.add("lock-scroll");

  ageConfirmBtn.addEventListener("click", () => {
    ageGate.hidden = true;
    document.body.classList.remove("lock-scroll");
  });

  ageRejectBtn.addEventListener("click", () => {
    const card = ageGate.querySelector(".age-gate-card");
    if (!card) {
      return;
    }

    card.innerHTML = `
      <p class="age-badge">18+</p>
      <h2>A tartalom nem érhető el</h2>
      <p>18 év alatti látogatók számára ez az oldal nem megtekinthető.</p>
    `;
  });
}

function showHeroSlide(index) {
  if (!state.heroSlides.length || !hero || !heroTitle || !heroSubtitle) {
    return;
  }

  const normalized = (index + state.heroSlides.length) % state.heroSlides.length;
  state.activeSlide = normalized;

  const slide = state.heroSlides[normalized];
  hero.style.setProperty("--hero-image", `url("${slide.image}")`);
  hero.style.setProperty("--hero-position", slide.imagePosition || "center center");
  heroTitle.textContent = slide.title || "Colibri Italdiszkont";
  heroSubtitle.textContent = slide.subtitle || "";
}

function startHeroAutoRotation() {
  if (state.timer) {
    clearInterval(state.timer);
  }

  if (state.heroSlides.length <= 1) {
    return;
  }

  state.timer = setInterval(() => {
    showHeroSlide(state.activeSlide + 1);
  }, 5500);
}

function setupHeroNavigation() {
  if (!heroPrev || !heroNext) {
    return;
  }

  heroPrev.addEventListener("click", () => {
    showHeroSlide(state.activeSlide - 1);
    startHeroAutoRotation();
  });

  heroNext.addEventListener("click", () => {
    showHeroSlide(state.activeSlide + 1);
    startHeroAutoRotation();
  });
}

function setupRevealAnimation() {
  const revealItems = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

async function loadContent() {
  try {
    const response = await fetch("kinalat.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    state.heroSlides = Array.isArray(data.heroSlides) ? data.heroSlides : [];
    const rawProducts = Array.isArray(data.termekek) ? data.termekek : [];
    state.products = sortProductsByName(rawProducts.map(enrichProduct));
    state.deals = Array.isArray(data.akciok) ? data.akciok : [];

    if (state.heroSlides.length) {
      showHeroSlide(0);
      startHeroAutoRotation();
    }

    renderCategoryFilters(state.products);
    applyProductFilters(true);
    renderDeals(state.deals);
  } catch (error) {
    renderStatus(productGrid, "Nem sikerült betölteni a termékeket.", true);
    renderStatus(dealStrip, "Nem sikerült betölteni az akciókat.", true);
    updateProductCount(0, 0);
    console.error("JSON betöltési hiba:", error);
  }
}

if (productSearch) {
  productSearch.addEventListener(
    "input",
    debounce(() => {
      applyProductFilters(true);
    })
  );
}

setupCategoryFilters();
setupHeroCatalogFilter();
setupLoadMoreProducts();
setupAdvancedFilters();
setupProductModal();
setupAgeGate();
setupHeroNavigation();
setupRevealAnimation();
loadContent();

const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear().toString();
}
