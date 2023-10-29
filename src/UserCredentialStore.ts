type Properties = GoogleAppsScript.Properties.Properties;

interface UserCredential {
  userID: string;
  password: string;
}

class UserCredentialStore {
  private readonly cipher;

  public constructor(
    private readonly propertyStore: Properties,
    private readonly passphraseSeeds: string,
  ) {
    const passphrase = this.makePassphrase(passphraseSeeds);
    this.cipher = new cCryptoGS.Cipher(passphrase, "aes");
  }

  public getUserCredential(id: string): UserCredential | null {
    const cryptedCredential = this.propertyStore.getProperty(id);

    if (cryptedCredential) {
      try {
        const credentail: UserCredential = JSON.parse(
          this.cipher.decrypt(cryptedCredential),
        );

        return credentail;
      } catch (e) {
        console.warn(
          `Credential decrypt faild. id: ${id}, message: ${e.message}`,
        );
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

  private makePassphrase(seeds: string): string {
    const digest: number[] = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_1,
      seeds,
      Utilities.Charset.US_ASCII,
    );

    return digest
      .map((b) => {
        return ("0" + ((b < 0 && b + 256) || b).toString(16)).substr(-2);
      })
      .join("");
  }
}

export { type UserCredential, UserCredentialStore };
