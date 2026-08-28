USE cse442_2026_spring_team_c_db;

CREATE TABLE IF NOT EXISTS api_publications_cache (
                                                      id INT AUTO_INCREMENT PRIMARY KEY,
                                                      external_id VARCHAR(255) NOT NULL,
    source_name VARCHAR(100) NOT NULL DEFAULT 'OpenAlex',
    title VARCHAR(500) NOT NULL,
    authors TEXT NOT NULL,
    journal VARCHAR(255) DEFAULT '',
    publication_year INT DEFAULT NULL,
    publication_date DATE DEFAULT NULL,
    doi VARCHAR(255) DEFAULT '',
    origin_url VARCHAR(1000) DEFAULT '',
    abstract_text MEDIUMTEXT,
    publication_type VARCHAR(100) DEFAULT '',
    raw_json LONGTEXT,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_external_source (external_id, source_name),
    KEY idx_api_pub_year (publication_year),
    KEY idx_api_pub_date (publication_date),
    KEY idx_api_pub_source (source_name)
    );

CREATE TABLE IF NOT EXISTS user_publications (
                                                 id INT AUTO_INCREMENT PRIMARY KEY,
                                                 user_id INT NOT NULL,
                                                 title VARCHAR(500) NOT NULL,
    authors TEXT NOT NULL,
    journal VARCHAR(255) DEFAULT '',
    publication_year INT DEFAULT NULL,
    publication_date DATE DEFAULT NULL,
    doi VARCHAR(255) DEFAULT '',
    origin_url VARCHAR(1000) DEFAULT '',
    abstract_text MEDIUMTEXT,
    publication_type VARCHAR(100) DEFAULT '',
    approval_status ENUM('pending', 'approved', 'denied') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_publications_user_id (user_id),
    KEY idx_user_publications_year (publication_year),
    KEY idx_user_publications_date (publication_date),
    KEY idx_user_publications_status (approval_status),
    CONSTRAINT fk_user_publications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
                                                   ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS publication_sync_status (
                                                       id INT AUTO_INCREMENT PRIMARY KEY,
                                                       provider VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    message VARCHAR(500) DEFAULT '',
    ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_publication_sync_provider (provider),
    KEY idx_publication_sync_ran_at (ran_at)
    );