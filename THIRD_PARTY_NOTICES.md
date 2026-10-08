# Third-party notices

dumbdown's original source is MIT licensed; see [LICENSE](LICENSE). Keep dependency notices when redistributing a build.

- The bundled Sites Vite integration retains its MIT notice in [build/sites-vite-plugin.LICENSE](build/sites-vite-plugin.LICENSE).
- The vendored shadcn stylesheet retains its notice in [vendor/shadcn-tailwind-4.13.0.LICENSE.md](vendor/shadcn-tailwind-4.13.0.LICENSE.md).
- npm dependencies retain their own licenses and notices in their installed packages. The frozen lockfile records the exact dependency versions.
- WebLLM and its runtime/model files are downloaded separately in device mode. They are not included in the source ZIP. Each selected model's upstream license and use terms still apply, including the Llama model's separate terms. Do not redistribute downloaded weights merely because this application's source uses MIT.

The optional OpenAI API is an external service used with the visitor's or local operator's own key. Its service terms are separate from the source license.
