import React, { useEffect, useMemo, useState } from 'react';
import Navbar from './homepage/Navbar';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import './Publications.css';

const IS_LOCAL =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const API_ROOT = IS_LOCAL
    ? 'http://localhost/s26-jnswl-corp/backend/public/api'
    : `${window.location.origin}/CSE442/2026-Spring/cse-442c/backend/public/api`;

const API_BASE = `${API_ROOT}/index.php`;

const PUBLICATION_TYPE_OPTIONS = [
    '',
    'article',
    'review',
    'report',
    'preprint',
    'case study',
    'book chapter',
    'thesis',
    'other',
];

const defaultForm = {
    title: '',
    authors: '',
    journal: '',
    publication_year: '',
    publication_date: '',
    doi: '',
    origin_url: '',
    abstract_text: '',
    publication_type: '',
};

const FIELD_LIMITS = {
    title: 300,
    authors: 300,
    journal: 200,
    publication_year: 4,
    doi: 255,
    origin_url: 1000,
    abstract_text: 3000,
};

function normalizeSpaces(value) {
    return value.replace(/\s+/g, ' ').trim();
}

function isRepeatedGarbage(value) {
    const compact = value.replace(/\s+/g, '');
    return compact.length >= 3 && /^([A-Za-z0-9])\1+$/.test(compact);
}

function validateForm(formData) {
    const errors = {};
    const currentYear = new Date().getFullYear();

    const title = normalizeSpaces(formData.title);
    const authors = normalizeSpaces(formData.authors);
    const journal = normalizeSpaces(formData.journal);
    const publicationYear = normalizeSpaces(formData.publication_year);
    const publicationDate = formData.publication_date.trim();
    const doi = normalizeSpaces(formData.doi);
    const originUrl = normalizeSpaces(formData.origin_url);
    const abstractText = normalizeSpaces(formData.abstract_text);
    const publicationType = normalizeSpaces(formData.publication_type);

    if (!title) {
        errors.title = 'Title is required.';
    } else if (title.length > FIELD_LIMITS.title) {
        errors.title = `Title must be ${FIELD_LIMITS.title} characters or fewer.`;
    } else if (isRepeatedGarbage(title)) {
        errors.title = 'Title cannot be a repeated single character.';
    }

    if (!authors) {
        errors.authors = 'Authors are required.';
    } else if (authors.length > FIELD_LIMITS.authors) {
        errors.authors = `Authors must be ${FIELD_LIMITS.authors} characters or fewer.`;
    } else if (isRepeatedGarbage(authors)) {
        errors.authors = 'Authors cannot be a repeated single character.';
    }

    if (journal.length > FIELD_LIMITS.journal) {
        errors.journal = `Journal / Publisher must be ${FIELD_LIMITS.journal} characters or fewer.`;
    } else if (journal && isRepeatedGarbage(journal)) {
        errors.journal = 'Journal / Publisher cannot be a repeated single character.';
    }

    if (publicationYear) {
        if (!/^\d{4}$/.test(publicationYear)) {
            errors.publication_year = 'Publication year must be a 4-digit year.';
        } else {
            const yearAsNumber = Number(publicationYear);
            if (yearAsNumber < 1900 || yearAsNumber > currentYear + 1) {
                errors.publication_year = `Publication year must be between 1900 and ${currentYear + 1}.`;
            }
        }
    }

    if (publicationDate && !/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) {
        errors.publication_date = 'Publication date must be in YYYY-MM-DD format.';
    }

    if (doi) {
        if (doi.length > FIELD_LIMITS.doi) {
            errors.doi = `DOI must be ${FIELD_LIMITS.doi} characters or fewer.`;
        } else if (!/^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i.test(doi)) {
            errors.doi = 'DOI must be in a valid format.';
        }
    }

    if (originUrl) {
        if (originUrl.length > FIELD_LIMITS.origin_url) {
            errors.origin_url = `External link must be ${FIELD_LIMITS.origin_url} characters or fewer.`;
        } else {
            try {
                const parsedUrl = new URL(originUrl);
                if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                    errors.origin_url = 'External link must start with http:// or https://';
                }
            } catch {
                errors.origin_url = 'External link must be a valid URL.';
            }
        }
    }

    if (abstractText.length > FIELD_LIMITS.abstract_text) {
        errors.abstract_text = `Abstract / Summary must be ${FIELD_LIMITS.abstract_text} characters or fewer.`;
    } else if (abstractText && isRepeatedGarbage(abstractText)) {
        errors.abstract_text = 'Abstract / Summary cannot be a repeated single character.';
    }

    if (publicationType && !PUBLICATION_TYPE_OPTIONS.includes(publicationType)) {
        errors.publication_type = 'Please select a valid publication type.';
    }

    if (publicationYear && publicationDate) {
        const dateYear = publicationDate.slice(0, 4);
        if (dateYear !== publicationYear) {
            errors.publication_date = 'Publication date year must match publication year.';
        }
    }

    return errors;
}

function sanitizePayload(formData) {
    return {
        title: normalizeSpaces(formData.title),
        authors: normalizeSpaces(formData.authors),
        journal: normalizeSpaces(formData.journal),
        publication_year: normalizeSpaces(formData.publication_year),
        publication_date: formData.publication_date.trim(),
        doi: normalizeSpaces(formData.doi),
        origin_url: normalizeSpaces(formData.origin_url),
        abstract_text: normalizeSpaces(formData.abstract_text),
        publication_type: normalizeSpaces(formData.publication_type),
    };
}

function Publications() {
    const [publications, setPublications] = useState([]);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [source, setSource] = useState('all');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [pagination, setPagination] = useState({
        page: 1,
        perPage: 10,
        total: 0,
        totalPages: 1,
    });

    const [apiStatus, setApiStatus] = useState({
        status: 'unknown',
        message: 'Loading publication service...',
        ran_at: null,
    });

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');
    const [formData, setFormData] = useState(defaultForm);
    const [formErrors, setFormErrors] = useState({});

    const statusLabel = useMemo(() => {
        if (apiStatus.status === 'up') return 'API Online';
        if (apiStatus.status === 'down') return 'API Offline • Using Cache';
        return 'API Status Unknown';
    }, [apiStatus]);

    const fetchPublications = async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams({
                r: 'publications-list',
                q: search,
                source,
                page: String(page),
                perPage: String(perPage),
            });

            const res = await fetch(`${API_BASE}?${params.toString()}`, {
                method: 'GET',
                credentials: 'include',
            });

            const data = await res.json();

            if (!res.ok || data.ok !== true) {
                throw new Error(data.error || 'Unable to load publications.');
            }

            setPublications(Array.isArray(data.items) ? data.items : []);
            setPagination(data.pagination || {
                page: 1,
                perPage,
                total: 0,
                totalPages: 1,
            });
            setApiStatus(data.apiStatus || {
                status: 'unknown',
                message: 'No API status available.',
                ran_at: null,
            });
            setIsLoggedIn(Boolean(data.isLoggedIn));
        } catch (err) {
            setError(err.message || 'Could not load publications.');
            setPublications([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPublications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, source, page, perPage]);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setShowUpload(false);
            }
        };

        if (showUpload) {
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [showUpload]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        setSearch(searchInput.trim());
    };

    const handleSourceChange = (e) => {
        setPage(1);
        setSource(e.target.value);
    };

    const handlePerPageChange = (e) => {
        setPage(1);
        setPerPage(Number(e.target.value));
    };

    const closeUploadModal = () => {
        setShowUpload(false);
        setFormErrors({});
    };

    const openUploadModal = () => {
        setSubmitMessage('');
        setFormErrors({});
        setShowUpload(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;

        let nextValue = value;

        if (name === 'publication_year') {
            nextValue = value.replace(/[^\d]/g, '').slice(0, FIELD_LIMITS.publication_year);
        }

        if (name === 'title') nextValue = value.slice(0, FIELD_LIMITS.title);
        if (name === 'authors') nextValue = value.slice(0, FIELD_LIMITS.authors);
        if (name === 'journal') nextValue = value.slice(0, FIELD_LIMITS.journal);
        if (name === 'doi') nextValue = value.slice(0, FIELD_LIMITS.doi);
        if (name === 'origin_url') nextValue = value.slice(0, FIELD_LIMITS.origin_url);
        if (name === 'abstract_text') nextValue = value.slice(0, FIELD_LIMITS.abstract_text);

        const nextFormData = {
            ...formData,
            [name]: nextValue,
        };

        setFormData(nextFormData);

        if (formErrors[name]) {
            const nextErrors = validateForm(nextFormData);
            setFormErrors((prev) => ({
                ...prev,
                [name]: nextErrors[name] || '',
            }));
        }
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        setSubmitMessage('');

        const cleanedPayload = sanitizePayload(formData);
        const validationErrors = validateForm(cleanedPayload);

        if (Object.keys(validationErrors).length > 0) {
            setFormErrors(validationErrors);
            setSubmitLoading(false);
            setSubmitMessage('Please fix the highlighted fields before submitting.');
            return;
        }

        setFormErrors({});

        try {
            const res = await fetch(`${API_BASE}?r=publications-submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(cleanedPayload),
            });

            const data = await res.json();

            if (!res.ok || data.ok !== true) {
                throw new Error(data.error || 'Submission failed.');
            }

            setSubmitMessage('Publication submitted for admin approval.');
            setFormData(defaultForm);
            setShowUpload(false);

            if (source === 'mine' || source === 'user' || source === 'all') {
                fetchPublications();
            }
        } catch (err) {
            setSubmitMessage(err.message || 'Submission failed.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const renderPublicationCard = (pub) => {
        const yearOrDate = pub.publication_date || pub.publication_year || 'Unknown date';
        const originUrl = pub.origin_url || pub.doi || '';
        const hasOrigin = typeof originUrl === 'string' && originUrl.trim() !== '';

        return (
            <article className="publications-card" key={`${pub.bucket}-${pub.id}`}>
                <div className="publications-card__top">
                    <div>
                        <h3 className="publications-card__title">{pub.title}</h3>
                        <p className="publications-card__meta">
                            <strong>Authors:</strong> {pub.authors || 'Unknown authors'}
                        </p>
                        <p className="publications-card__meta">
                            <strong>Journal/Source:</strong> {pub.journal || 'Not provided'}
                        </p>
                        <p className="publications-card__meta">
                            <strong>Publication Date:</strong> {yearOrDate}
                        </p>
                        <p className="publications-card__meta">
                            <strong>Record Type:</strong> {pub.publication_type || 'Research publication'}
                        </p>
                        <p className="publications-card__meta">
                            <strong>Platform Source:</strong> {pub.display_source}
                        </p>
                        {pub.doi && (
                            <p className="publications-card__meta">
                                <strong>DOI:</strong> {pub.doi}
                            </p>
                        )}
                    </div>

                    <div className="publications-card__badges">
                        <span className={`publications-badge ${pub.bucket === 'api' ? 'publications-badge--api' : 'publications-badge--user'}`}>
                            {pub.bucket === 'api' ? 'API Publication' : 'User Publication'}
                        </span>

                        {pub.submitted_by_me && (
                            <span className="publications-badge publications-badge--mine">
                                My Upload
                            </span>
                        )}

                        {pub.bucket === 'user' && pub.approval_status && (
                            <span className={`publications-badge publications-badge--status publications-badge--status-${pub.approval_status}`}>
                                {pub.approval_status.charAt(0).toUpperCase() + pub.approval_status.slice(1)}
                            </span>
                        )}
                    </div>
                </div>

                {pub.abstract_text && (
                    <p className="publications-card__abstract">{pub.abstract_text}</p>
                )}

                <div className="publications-card__actions">
                    {hasOrigin ? (
                        <a
                            href={originUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="publications-link-btn"
                        >
                            View Original Publication
                        </a>
                    ) : (
                        <span className="publications-link-btn publications-link-btn--disabled">
                            No External Link
                        </span>
                    )}
                </div>
            </article>
        );
    };

    return (
        <div className="publications-page">
            <SiteHeader />
            <Navbar />

            <main className="publications-main">
                <section className="publications-hero">
                    <div>
                        <h2>Research Publications</h2>
                        <p>
                            Search livestock epidemic publications from cached OpenAlex data and
                            publications uploaded by researchers using the platform.
                        </p>
                    </div>

                    <div className={`publications-status ${
                        apiStatus.status === 'up'
                            ? 'publications-status--up'
                            : apiStatus.status === 'down'
                                ? 'publications-status--down'
                                : 'publications-status--unknown'
                    }`}>
                        <strong>{statusLabel}</strong>
                        <span>{apiStatus.message}</span>
                    </div>
                </section>

                {submitMessage && !showUpload && (
                    <div className="publications-submit-message publications-submit-message--standalone">
                        {submitMessage}
                    </div>
                )}

                <section className="publications-toolbar">
                    <form className="publications-search" onSubmit={handleSearchSubmit}>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search title, authors, journal, DOI, abstract..."
                            className="publications-search__input"
                        />
                        <button type="submit" className="publications-btn">
                            Search
                        </button>
                    </form>

                    <div className="publications-controls">
                        <label>
                            Source
                            <select value={source} onChange={handleSourceChange}>
                                <option value="all">All Publications</option>
                                <option value="api">API Publications</option>
                                <option value="user">User Publications</option>
                                <option value="mine">My Uploaded Publications</option>
                            </select>
                        </label>

                        <label>
                            Show
                            <select value={perPage} onChange={handlePerPageChange}>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={30}>30</option>
                                <option value={40}>40</option>
                                <option value={50}>50</option>
                            </select>
                        </label>

                        <button
                            type="button"
                            className="publications-btn publications-btn--secondary"
                            onClick={showUpload ? closeUploadModal : openUploadModal}
                        >
                            {showUpload ? 'Close Upload Form' : 'Upload Publication'}
                        </button>
                    </div>
                </section>

                {showUpload && (
                    <div
                        className="publications-modal-backdrop"
                        onClick={closeUploadModal}
                        role="presentation"
                    >
                        <section
                            className="publications-upload publications-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="publications-modal__header">
                                <div>
                                    <h3>Upload a Publication</h3>
                                    <p className="publications-modal__subtext">
                                        Submissions are saved as pending and must be approved by an admin before they appear in public publication results.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="publications-modal__close"
                                    onClick={closeUploadModal}
                                    aria-label="Close upload form"
                                >
                                    ×
                                </button>
                            </div>

                            {!isLoggedIn && (
                                <div className="publications-warning">
                                    You must be logged in to submit a publication.
                                </div>
                            )}

                            <form className="publications-upload__form" onSubmit={handleUploadSubmit}>
                                <label>
                                    Title *
                                    <input
                                        name="title"
                                        value={formData.title}
                                        onChange={handleFormChange}
                                        required
                                        maxLength={FIELD_LIMITS.title}
                                        className={formErrors.title ? 'publications-field--error' : ''}
                                    />
                                    {formErrors.title && <span className="publications-field-error">{formErrors.title}</span>}
                                </label>

                                <label>
                                    Authors *
                                    <input
                                        name="authors"
                                        value={formData.authors}
                                        onChange={handleFormChange}
                                        required
                                        maxLength={FIELD_LIMITS.authors}
                                        className={formErrors.authors ? 'publications-field--error' : ''}
                                    />
                                    {formErrors.authors && <span className="publications-field-error">{formErrors.authors}</span>}
                                </label>

                                <label>
                                    Journal / Publisher
                                    <input
                                        name="journal"
                                        value={formData.journal}
                                        onChange={handleFormChange}
                                        maxLength={FIELD_LIMITS.journal}
                                        className={formErrors.journal ? 'publications-field--error' : ''}
                                    />
                                    {formErrors.journal && <span className="publications-field-error">{formErrors.journal}</span>}
                                </label>

                                <label>
                                    Publication Year
                                    <input
                                        name="publication_year"
                                        value={formData.publication_year}
                                        onChange={handleFormChange}
                                        placeholder="2026"
                                        inputMode="numeric"
                                        maxLength={FIELD_LIMITS.publication_year}
                                        className={formErrors.publication_year ? 'publications-field--error' : ''}
                                    />
                                    {formErrors.publication_year && <span className="publications-field-error">{formErrors.publication_year}</span>}
                                </label>

                                <label>
                                    Publication Date
                                    <input
                                        name="publication_date"
                                        type="date"
                                        value={formData.publication_date}
                                        onChange={handleFormChange}
                                        className={formErrors.publication_date ? 'publications-field--error' : ''}
                                    />
                                    {formErrors.publication_date && <span className="publications-field-error">{formErrors.publication_date}</span>}
                                </label>

                                <label>
                                    DOI
                                    <input
                                        name="doi"
                                        value={formData.doi}
                                        onChange={handleFormChange}
                                        maxLength={FIELD_LIMITS.doi}
                                        placeholder="10.1000/xyz123"
                                        className={formErrors.doi ? 'publications-field--error' : ''}
                                    />
                                    {formErrors.doi && <span className="publications-field-error">{formErrors.doi}</span>}
                                </label>

                                <label>
                                    External Link
                                    <input
                                        name="origin_url"
                                        type="url"
                                        value={formData.origin_url}
                                        onChange={handleFormChange}
                                        placeholder="https://..."
                                        maxLength={FIELD_LIMITS.origin_url}
                                        className={formErrors.origin_url ? 'publications-field--error' : ''}
                                    />
                                    {formErrors.origin_url && <span className="publications-field-error">{formErrors.origin_url}</span>}
                                </label>

                                <label>
                                    Publication Type
                                    <select
                                        name="publication_type"
                                        value={formData.publication_type}
                                        onChange={handleFormChange}
                                        className={formErrors.publication_type ? 'publications-field--error' : ''}
                                    >
                                        <option value="">Select one</option>
                                        <option value="article">Article</option>
                                        <option value="review">Review</option>
                                        <option value="report">Report</option>
                                        <option value="preprint">Preprint</option>
                                        <option value="case study">Case Study</option>
                                        <option value="book chapter">Book Chapter</option>
                                        <option value="thesis">Thesis</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {formErrors.publication_type && <span className="publications-field-error">{formErrors.publication_type}</span>}
                                </label>

                                <label className="publications-upload__textarea">
                                    Abstract / Summary
                                    <textarea
                                        name="abstract_text"
                                        value={formData.abstract_text}
                                        onChange={handleFormChange}
                                        rows="6"
                                        maxLength={FIELD_LIMITS.abstract_text}
                                        className={formErrors.abstract_text ? 'publications-field--error' : ''}
                                    />
                                    <span className="publications-character-count">
                                        {formData.abstract_text.length}/{FIELD_LIMITS.abstract_text}
                                    </span>
                                    {formErrors.abstract_text && <span className="publications-field-error">{formErrors.abstract_text}</span>}
                                </label>

                                <div className="publications-upload__actions">
                                    <button
                                        type="submit"
                                        className="publications-btn"
                                        disabled={!isLoggedIn || submitLoading}
                                    >
                                        {submitLoading ? 'Submitting...' : 'Submit Publication'}
                                    </button>
                                </div>

                                {submitMessage && showUpload && (
                                    <div className="publications-submit-message">{submitMessage}</div>
                                )}
                            </form>
                        </section>
                    </div>
                )}

                <section className="publications-results">
                    <div className="publications-results__header">
                        <h3>Available Publications</h3>
                        <span>
                            {pagination.total} total result{pagination.total === 1 ? '' : 's'}
                        </span>
                    </div>

                    {loading && <div className="publications-message">Loading publications...</div>}
                    {error && <div className="publications-error">{error}</div>}
                    {!loading && !error && publications.length === 0 && (
                        <div className="publications-message">
                            No publications matched your current filters.
                        </div>
                    )}

                    <div className="publications-grid">
                        {!loading && !error && publications.map(renderPublicationCard)}
                    </div>
                </section>

                <section className="publications-pagination">
                    <button
                        className="publications-btn publications-btn--secondary"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={pagination.page <= 1}
                    >
                        Previous
                    </button>

                    <span className="publications-pagination__text">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>

                    <button
                        className="publications-btn publications-btn--secondary"
                        onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                        disabled={pagination.page >= pagination.totalPages}
                    >
                        Next
                    </button>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}

export default Publications;