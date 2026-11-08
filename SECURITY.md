# Security Policy

Afribit AI is used by people learning to handle money, so security and safety
reports are taken seriously.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.** Email
[eddie@afribit.africa](mailto:eddie@afribit.africa) with:

- what you found and where (file, endpoint, or behaviour),
- steps to reproduce,
- the impact you think it has.

You can expect an acknowledgement within a few days. We'll keep you updated on
the fix, and — if you wish — credit you when it ships. Please give us reasonable
time to fix the problem before disclosing it publicly.

## In scope

- The API (`apps/api`) and web app (`apps/web`) in this repository.
- Authentication and authorisation, including admin and contributor routes.
- Anything that could expose user conversations, accounts, or push-notification
  subscriptions.
- Ways to bypass the secret-detection and output-safety checks.

## Safety problems that are *not* security vulnerabilities

If the assistant gives a wrong, misleading or unsafe *answer* — for example
overstating Bitcoin's speed or safety, implying a transaction can always be
reversed, or failing to warn about a scam — that is a content-safety problem, not
a vulnerability. Please file it publicly using the
[unsafe or wrong answer template](https://github.com/Afribit-Kibera/afribit-ai-chatbot/issues/new?template=unsafe_or_wrong_answer.yml)
so it can be fixed and added to the evaluation set.

## Please don't

- Test against real users' data, or send traffic that degrades the live service.
- Include real seed phrases, keys or other secrets in reports.

## Supported versions

The project is pre-1.0. Only the latest commit on the default branch is supported.
