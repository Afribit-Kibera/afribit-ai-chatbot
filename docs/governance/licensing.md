# Licensing and project identity

Effective for this revision: 8 November 2026.

## Application license

Afribit Africa's original application code is **AGPL-3.0-only**, the unmodified GNU Affero General
Public License version3. The standard text is in [LICENSE](../../LICENSE); package manifests carry
the same SPDX identifier. This choice supports self-hosting and paid services while requiring a
modified network service to offer its corresponding source to its users. It does not prohibit
commercial competitors, charge per-user license fees, or require publishing learners' data.
[Official license](https://www.gnu.org/licenses/agpl-3.0.html),
[license summary](https://choosealicense.com/licenses/agpl-3.0/).

For a modified deployment, provide a visible source/license entry pointing to the source actually
running, including the scripts/configuration needed to build and install it. A link to an unrelated
upstream version is insufficient. Keep credentials and private community/member data out of that
source offer. The app provides source/license access in My space and Settings; operators must keep
that destination accurate when deploying another revision.

Prior revisions were Apache-2.0. Their existing grants are not revoked by this change. The former
license text is preserved in [LICENSES/Apache-2.0.txt](../../LICENSES/Apache-2.0.txt), and required
third-party notices remain. This release changes the license for project-owned work; it does not
claim ownership of dependencies, upstream components or imported content.

## Content, dependencies and branding

- Original teaching material and documentation: [CC BY-SA4.0](../../LICENSE-CONTENT), with attribution
  and share-alike terms. Importing third-party sources does not automatically place them under it.
- Third-party datasets: retain their own terms and credits in [NOTICE](../../NOTICE).
- Open Notebook, retained voice components, fonts, containers and model weights: upstream licenses
  apply separately. The application license does not license a model's training data or weights.
- Afribit names/logos: the [branding policy](../BRANDING.md) permits accurate descriptive credit,
  but not a claim of endorsement or operation by Afribit. That policy adds no restriction to the
  software rights granted by AGPL.

## Authorship and intellectual property

Release commits use **Afribit Africa** and its GitHub account's no-reply identity. The34 previous
commits were authored under Edmund Spira's email; `.mailmap` maps that identity to Afribit Africa
in Git views that support mailmaps. This preserves commit objects and provenance. It does not
change signed commit metadata or guarantee every hosting interface displays the mapped name.
[Git mailmap documentation](https://git-scm.com/docs/gitmailmap).

Copyright and contributor credits are retained. A commit author name, GitHub organization, license
notice or mailmap is not a legal assignment of copyright, a trademark registration, or evidence of
a patent. Any formal transfer from an individual or future contributor needs a separate agreement.
Do not map unrelated future contributors to the organization or remove their required attribution.

Contributions are accepted under the applicable code/content license in
[CONTRIBUTING.md](../../CONTRIBUTING.md). No contributor IP assignment is implied.
