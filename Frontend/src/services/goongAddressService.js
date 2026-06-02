const FALLBACK_GOONG_API_KEY = 'UgMLDwF917XMTQzcb9b7bk8JLgqKmQe6gJKZWD9Q';

export const GOONG_API_KEY =
  import.meta.env.VITE_GOONG_API_KEY ||
  import.meta.env.VITE_GOONG_MAP_API_KEY ||
  FALLBACK_GOONG_API_KEY;

const ADMIN_PREFIX_RE = /^(tinh|thanh pho|tp|quan|huyen|thi xa|tx|phuong|xa|thi tran)\s+/;

export const normalizeLocationText = (value = '') => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .replace(/[.,]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const stripAdminPrefix = (value = '') => normalizeLocationText(value)
  .replace(ADMIN_PREFIX_RE, '')
  .trim();

const isSameAdminPart = (value, target) => {
  if (!value || !target) return false;
  return normalizeLocationText(value) === normalizeLocationText(target)
    || stripAdminPrefix(value) === stripAdminPrefix(target);
};

const compactParts = (parts) => {
  const seen = new Set();
  return parts
    .map(part => String(part || '').trim())
    .filter(Boolean)
    .filter((part) => {
      const key = normalizeLocationText(part);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const findAdminTerm = (terms, compoundValue, prefixes) => {
  if (!compoundValue) return '';
  const termValues = terms.map(term => term.value || term).filter(Boolean);
  const match = termValues.find((term) => {
    const normalized = normalizeLocationText(term);
    return isSameAdminPart(term, compoundValue)
      || prefixes.some(prefix => normalized.startsWith(prefix) && normalized.includes(stripAdminPrefix(compoundValue)));
  });

  return match || compoundValue;
};

export const composeGoongAddress = ({ detailAddress, address, ward, district, province, city } = {}) => (
  compactParts([
    detailAddress || address,
    ward,
    district,
    province || city
  ]).join(', ')
);

export const composeStreetAddress = (detailAddress, ward) => (
  compactParts([detailAddress, ward]).join(', ')
);

export const parseStoredGoongAddress = (address = '') => {
  const parts = String(address || '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => !['viet nam', 'vn', 'vietnam'].includes(normalizeLocationText(part)));

  if (parts.length === 0) {
    return { address: '', detailAddress: '', ward: '', district: '', city: '', province: '', fullAddress: '' };
  }

  const values = [...parts];
  const province = values.length > 1 ? values.pop() : '';
  let district = '';
  let ward = '';

  if (values.length > 1) {
    district = values.pop();
  }

  if (values.length > 1) {
    ward = values.pop();
  }

  const detailAddress = values.join(', ') || (parts.length === 1 ? parts[0] : '');

  return {
    address: detailAddress,
    detailAddress,
    ward,
    district,
    city: province,
    province,
    fullAddress: parts.join(', ')
  };
};

export const parseGoongPrediction = (prediction = {}, typedAddress = '') => {
  const compound = prediction.compound || {};
  const terms = prediction.terms || [];
  const description = prediction.description || prediction.formatted_address || '';
  const termValues = terms.map(term => term.value).filter(Boolean);

  const province = findAdminTerm(terms, compound.province, ['tinh ', 'thanh pho ', 'tp '])
    || (termValues.length > 0 ? termValues[termValues.length - 1] : '');
  const district = findAdminTerm(terms, compound.district, ['quan ', 'huyen ', 'thi xa ', 'tx '])
    || (termValues.length > 1 ? termValues[termValues.length - 2] : '');
  const ward = findAdminTerm(terms, compound.commune || compound.ward, ['phuong ', 'xa ', 'thi tran ']);

  const detailParts = (termValues.length ? termValues : description.split(',').map(part => part.trim()))
    .filter(Boolean)
    .filter(part => !['viet nam', 'vn', 'vietnam'].includes(normalizeLocationText(part)))
    .filter(part => !isSameAdminPart(part, province))
    .filter(part => !isSameAdminPart(part, district))
    .filter(part => !isSameAdminPart(part, ward));

  const fallbackDetail = prediction.structured_formatting?.main_text
    || description.split(',')[0]
    || typedAddress;
  const detailAddress = compactParts(detailParts).join(', ') || fallbackDetail || '';

  return {
    placeId: prediction.place_id || prediction.reference || '',
    description,
    displayName: description,
    mainText: prediction.structured_formatting?.main_text || detailAddress || description,
    secondaryText: prediction.structured_formatting?.secondary_text || description,
    address: detailAddress,
    detailAddress,
    ward: ward || '',
    district: district || '',
    city: province || '',
    province: province || '',
    fullAddress: composeGoongAddress({ detailAddress, ward, district, province }),
    raw: prediction
  };
};

const fetchGoongAutocomplete = async (query) => {
  if (!GOONG_API_KEY || !query.trim()) return [];

  const res = await fetch(
    `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(query.trim())}`
  );
  const data = await res.json();
  return Array.isArray(data?.predictions) ? data.predictions : [];
};

export const searchGoongPlaces = async (input, context = {}) => {
  const cleanInput = String(input || '').trim();
  if (cleanInput.length < 2) return [];

  const contextualQuery = composeGoongAddress({
    detailAddress: cleanInput,
    ward: context.ward,
    district: context.district,
    province: context.city || context.province
  });
  const queries = [...new Set([contextualQuery, cleanInput].filter(Boolean))];

  for (const query of queries) {
    const predictions = await fetchGoongAutocomplete(query);
    if (predictions.length > 0) {
      return predictions.map(prediction => parseGoongPrediction(prediction, cleanInput));
    }
  }

  return [];
};
