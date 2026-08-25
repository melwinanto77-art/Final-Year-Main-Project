"""ApiError — port of server/src/utils/ApiError.js.

Raised from services/state machines and converted by the exception handler
in main.py into the same flat envelope Express emits:
{ error, message, details? }.
"""


class ApiError(Exception):
    def __init__(self, status_code, message, details=None):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.details = details

    @classmethod
    def bad_request(cls, message):
        return cls(400, message)

    @classmethod
    def not_found(cls, what):
        return cls(404, f'{what} not found')

    @classmethod
    def conflict(cls, message):
        return cls(409, message)
