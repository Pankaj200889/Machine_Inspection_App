# Security Whitepaper
**Machine Inspection App | Enterprise Trust & Data Security**
*Version 1.0 - February 2026*

---

## 1. Executive Summary
The Machine Inspection App is built with a "Security First" architecture, designed to protect sensitive operational data while ensuring high availability for manufacturing environments. This document outlines the security controls, data protection measures, and compliance standards implemented within our platform.

## 2. Infrastructure Security
We utilize industry-leading cloud infrastructure to ensure physical security and network integrity.

*   **Cloud Provider**: All services are hosted on **Railway**, which utilizes secure data centers (AWS/GCP underlying infrastructure) compliant with SOC 2 Type II and ISO 27001.
*   **Database**: Managed **PostgreSQL** ensures data integrity with automated backups and encryption at rest.
*   **Network Isolation**: Application services run in isolated containers, minimizing attack surface.

## 3. Data Protection
### 3.1 Encryption
*   **In-Transit**: All data transmission between the Mobile App/Web Dashboard and our servers is encrypted using **TLS 1.2+ (HTTPS)**. We enforce Strict Transport Security (HSTS).
*   **At-Rest**: Critical user credentials (passwords) are hashed using **Bcrypt**, an industry-standard algorithm that makes them computationally safe against brute-force attacks. No raw passwords are ever stored.

### 3.2 Data Privacy
*   **Tenant Isolation**: Logical separation of data ensures that organizations cannot access each other's data.
*   **Data Minimization**: We only store essential operational data. No personal financial information or unrelated metadata is collected.

## 4. Authentication & Access Control
### 4.1 Secure Authentication
*   **JWT (JSON Web Tokens)**: Stateful sessions are avoided in favor of secure, time-limited tokens.
*   **Password Policy**: We enforce strong passwords (minimum length, mixed case, special characters) to prevent weak credentials.
*   **Brute Force Protection**: Rate limiting is applied to login endpoints to block automated attacks.

### 4.2 Role-Based Access Control (RBAC)
Strict permission levels ensure users only access what they need:
*   **Admin**: Full access to Machine Management, User Management, and Analytics.
*   **Operator**: Restricted access limited to "Scan & Submit" functionality. Operators cannot delete history or modify machine configurations.

## 5. Reliability & Compliance
*   **Audit Logging**: Critical actions (e.g., editing a checklist record) are logged with a timestamp and user ID. We enforce a strict "Max 3 Edits" policy to prevent data manipulation fraud.
*   **Uptime**: Our architecture is designed for 99.9% uptime with automatic service recovery.
*   **Disaster Recovery**: Automated daily backups allow us to restore data points to a previous state in the event of a catastrophic failure.

## 6. Software Development Lifecycle (SDLC)
*   **Code Review**: All changes undergo rigorous peer review and automated testing before deployment.
*   **CI/CD**: We use GitHub Actions for secure, automated builds, reducing humans-in-the-loop and potential for manual errors or key leakage.
*   **Vulnerability Scanning**: Dependencies are regularly scanned for known security vulnerabilities (CVEs).

---

*For further security inquiries, please contact our compliance team.*
