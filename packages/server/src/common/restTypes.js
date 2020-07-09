export class JWTPayload {
  constructor() {
    this.header = Object;
    this.body = Object;
    this.verified = false;
    this.return_url = "";
    this.error_url = "";
    this.jwt = "";
    this.return_json = "";
    this.names_roles = false;
    this.grading = false;
  }

}
