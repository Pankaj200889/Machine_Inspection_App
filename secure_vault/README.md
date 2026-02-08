# Secure App Vault

This folder is designated for storing built APK files.

**Note on Security:**
Git does not natively support "password protected folders". Access to this file is controlled by who has access to this Private Repository.

## How to use:
1.  **Build the APK**:
    - Open the project in Android Studio.
    - Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
    - Once built, locate the file (`debug` or `release`).
2.  **Place it here**:
    - Copy the `.apk` file into this `secure_vault` folder.
    - Rename it to `MachineApp_latest.apk`.
3.  **Password Protection (Optional)**:
    - If you require an extra layer of password protection (e.g., for emailing), please Right-Click the APK -> **Send to** -> **Compressed (zipped) folder**.
    - Use a tool like 7-Zip to add a password to the archive if standard Windows zip doesn't offer it.
4.  **Push to Git**:
    - Run:
      ```bash
      git add secure_vault/
      git commit -m "Upload latest APK to vault"
      git push
      ```
