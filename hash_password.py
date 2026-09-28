import getpass
from werkzeug.security import generate_password_hash

# --- A simple tool to generate a secure password hash for your application ---

def create_password_hash():
    """
    Prompts the user for a password securely and prints its hash.
    """
    try:
        # Use getpass to hide the password as it's being typed
        password = getpass.getpass(prompt="Enter the new password for the admin account: ")
        
        if not password:
            print("\nPassword cannot be empty. Aborting.")
            return

        # Confirm the password to avoid typos
        confirm_password = getpass.getpass(prompt="Confirm the new password: ")

        if password != confirm_password:
            print("\nPasswords do not match. Aborting.")
            return

        # --- FIX: Explicitly set the hashing method to match the backend ---
        # This ensures the generated hash is always compatible with check_password_hash
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

        print("\n" + "="*50)
        print("  Password hash generated successfully!")
        print("  Copy the entire line below (it starts with 'pbkdf2:sha256...'):")
        print("-" * 50)
        print(f"  {hashed_password}")
        print("="*50)
        print("\nNext, update the 'password' column for your admin user in the database.")

    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == '__main__':
    create_password_hash()
