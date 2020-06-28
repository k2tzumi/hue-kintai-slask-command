type Properties = GoogleAppsScript.Properties.Properties;

interface UserCredential {
    userID: string;
    password: string;
}

class UserCredentialStore {
    private cipher;

    public constructor(private propertyStore: Properties, private passphrase: string) {
        this.cipher = new cCryptoGS.Cipher(passphrase, 'aes');
    }

    public getUserCredential(id: string): UserCredential | null {
        const cryptedCredential = this.propertyStore.getProperty(id);

        if (cryptedCredential) {
            try {
                const credentail: UserCredential = JSON.parse(this.cipher.decrypt(cryptedCredential));

                return credentail;
            } catch (e) {
                console.warn(`Credential decrypt faild. id: ${id}, message: ${e.message}`);
                this.removeUserCredential(id);
            }
        }

        return null;
    }

    public setUserCredential(id: string, credentail: UserCredential): void {
        const plainCredentail = JSON.stringify(credentail);
        this.propertyStore.setProperty(id, this.cipher.encrypt(plainCredentail));
    }

    public removeUserCredential(id: string): void {
        this.propertyStore.deleteProperty(id);
    }
}

export { UserCredential, UserCredentialStore }