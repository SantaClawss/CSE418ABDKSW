-- sql/users.sql
-- Run this in phpMyAdmin: https://aptitude.cse.buffalo.edu/phpmyadmin/

USE cse442_2026_spring_team_c_db;

-- Create users table if it does not exist yet
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50),
    email         VARCHAR(100) NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,
    first_name    VARCHAR(50),
    last_name     VARCHAR(50),
    state         VARCHAR(50),
    city          VARCHAR(50),
    address       VARCHAR(200),
    zip           VARCHAR(20),
    phone         VARCHAR(30),
    profile_image VARCHAR(255) DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- If users table already exists, just add the missing profile columns
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username      VARCHAR(50),
    ADD COLUMN IF NOT EXISTS first_name    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS last_name     VARCHAR(50),
    ADD COLUMN IF NOT EXISTS state         VARCHAR(50),
    ADD COLUMN IF NOT EXISTS city          VARCHAR(50),
    ADD COLUMN IF NOT EXISTS address       VARCHAR(200),
    ADD COLUMN IF NOT EXISTS zip           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS phone         VARCHAR(30),
    ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) DEFAULT NULL;