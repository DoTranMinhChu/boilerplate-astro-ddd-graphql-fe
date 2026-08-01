## Core

The `core` folder is a shared git-subrepo, do not change its data unless you want to add or update the core functionality of multiple projects.

If you want to make changes to core functionality of the current repo, use the `shared` folder, if the functionality repeats or generic enough, it will be move to the `core` folder later.

## Changelog

Increase the version each time you make changes and document the changes.
Notify the team working on repos that depends on the subtree to update the version.
Using `git-subrepo` to manage this repository, only require it for contributing or owner.

---

### v3.3.4

- fix(createControl): sửa infinite reactive loop khi 1 control (`Input`, ...)
  được dùng ở chế độ controlled thuần (`value`+`onChange`, KHÔNG qua
  `Field`/`Formlog` context) và `onChange` phía cha set lại state bằng cách
  tạo object mới (ví dụ `setForm(prev => ({...prev, [key]: val}))`). Effect
  đồng bộ `props.value` → signal nội bộ trước đây gọi `onChange(val)` (tự
  propagate ngược lên `props.onChange`), khiến mỗi lần cha set state bằng
  object mới lại kích hoạt chính effect này lặp vô hạn — signal nội bộ kẹt ở
  giá trị BAN ĐẦU, không bao giờ phản ánh giá trị thật gán vào sau đó (biểu
  hiện: chọn lại 1 bản ghi khác trong form thì các `Input` hiện trống dù data
  đã đúng). Sửa: effect chỉ `setValue(val)` để đồng bộ hiển thị, không gọi lại
  `onChange` lên trên. Không ảnh hưởng control dùng qua `Field` context (case
  đó `props.value` luôn `undefined` nên effect này vốn đã bỏ qua).

---

### v3.3.3

- Routes: add RoutePathsOf to get all paths or of some layouts, for sidebars

---

### v3.3.2

- fix: wrong path when layout path is empty

---

### v3.3.1

- update Routes to support new format, dynamic typings
- add None for placeholder layout

---

### v3.3.0

- rewrite Routes to support dynamic and typing for useRoutes

---

### v3.2.0

- add zmp-cli scripts

---

### v3.1.0

- graphql: add init function, add getter/setter for backendUrl, will load from env if not exists on get

---

### v3.0.0

- graphql: include backendUrl, use this if not provided will fallback to a default BACKEND_URL env
- uploadMedia: requires contentLength for presignedUrl, add error check
- ButtonGroup: add displayStyle and color
- DropdownSelect: readOnly on mobile
- InputDate: numeric input
- InputMedia: add default max multiple size, display error better, add UI for managing image in multi mode in mobile
- InputNumber: add scaling, and use numeric mode
- Confirm: has extra color
- Dialog: use displayStyle for buttonGroup
- Field: clear error only when its data changed
- FiedlSet: default to have bottom padding
- generateForm: better typings support and purge typename on all submitted data
- validateForm: allows nested field name
- baseIconVariant: add user, map
- Toast: dismiss when clicked on mobile (due to a bug)
- ToastProvider: allows dismiss and add id to Toast
- Img: properly call onLoad
- scalars: remove Point
- api: use GraphQL.backendUrl instead
- device: checkMobileAndTablet -> checkMobileOrTablet

---

### v2.5.0

- add hashHmacSH256
- change Img from border to bordered due to type error
- fix GeneratedTable setItems to a store that granually mutate

---

### v2.4.1

- InfoList: add hideLabel
- global.d: add OmitStrict

---

### v2.4.0

- DropdownSelect/Select: Add ItemType and add stricter typings, add onItemChange
- Input: Add transformValue to force value format
- DialogHeader display props.children
- FieldFooter: hints allows JSX.Element
- FormControlProps: stricter type and onChange removes extraVal

---

### v2.3.0

- ToastProvider: add copy
- Empty: update style
- Img: fix the generate src with size
- InfoList: Add label and content column props
- QRCodeImage: contain
- StatusBadge: add outline style
- api: rename
- jwt: use library, add check expired function

---

### v2.2.0

- base.css: add predefined inline classes (removes safelist)
- string: add checkUrlValid
- secret: add maskSecret
- utilities: add PageTitle and SectionTitle
- validateForm/Field: add url check
- ButtonLink: update style
- baseText: add formUrlInvalid

---

### v2.1.3

- Button: add: cursor-pointer to base button
- BaseConfig: uploadMedia is optional
- InputMedia/MediaEditor: return error if uploadMedia does not exist
- ModalProvider: Fix dropdown floating render when upgrading to tailwind 4
- Button/DropdownSelect: Fix minor tailwind class
- DatatableSearch: removing leading 0 at any length in search for phone field

---

### v2.1.2

- base.css: Put the base style in layer base
- baseConfig: use default config on init

---

### v2.1.0

- remove sass, config files
- styles: update css files to new tailwind format

---

### v2.0.0

- Tailwind: migrate to v4.

---

##### v1.0.11

- Field/Label: Fix requiredIcon and tooltipIcon

---

### v1.1.10

- Button: Add nativeAnchor

---

### v1.1.9

- base.service: update types
- Editor/Floating/ModalProvider/Tabs: update Ref types

---

### v1.1.8

- DropdownSelect: Img add square
- InputDate: checking formatted text before update
- InputFile/InputVideo: fix bug when file is undefined in children
- InputMedia: fix bug when reuploading doesn't trigger
- generateForm: fix ref
- Link: new utilities

---

### v1.1.7

- AstroImage: add to use in Astro file
- AstroSEO: remove astro-seo-meta
- DropdownSelect/InputMedia: fix types
- Img: update types to match with AstroImage and its intrictions properties for img, not default to square anymore
- QRCodeImage/Cell: default to square

---

### v1.1.6

- AstroSEO: change package and format
- Button: allow Dynamic a and A tag
- Toast: update animation

---

### v1.1.5

- Add: AstroSEO

---

### v1.1.4

- radash: refactor to radashi

---

### v1.1.3

- baseIconVariant: add dotsVertical
- Datatable/Pagination: switch up flex-1 to pagination instead

---

### v1.1.3

- AstroTable: using a tag for content with url
- uploadMedia: default to inline
- InputMedia: add extraText

---

### v1.1.2

- config.client: add optiosn for PUBLIC\_ or not
- config.server: add ts check for astro import
- config: update typing.

---

### v1.1.1

- uploadMedia: fix content-disposition file name encoding
- AstroTable/Table: use w-1 instead for fitContent
- InputMedia: fix accept for _/_ type and add hideRatioLabel options
- InputFile: hideLabel and add tooltip, allow all files
- external: Add ConfigInjector
- Datatable: update style

---

### v1.1.0

- graphql: change client to getClient and make it async so it can call getConfig
- config: add getConfig that fetch two version, one for server and one for client.
- Button: move tooltip to lazy load
- Editor: update to v43, use new build tools directly, remove external build dependency.
- MediaEditor: lazy load Editor
- ssr: remove isSSR helper and use import.meta.env.SSR directly (in Callout, Img, screen)
- api: use getClientConfig
- base.service: remove client

---

### v1.0.0

- Remove index files to make lazy load work properly.

---

### v0.9.9

- createData: update loadMore for backward direction
- graphql: try catch for graphql error

---

### v0.9.8

- BaseText: update datatableSearchByLabel
- DatatableSearch: fix field label not showing
- device: allow passing in userAgent (for SSR)

---

### v0.9.7

- Dialog: update bottomSheet condition
- ModalProvider: add max-w-full for submodal
- Skeleton: Update default style
- screen: no threshold

---

### v0.9.6

- Radio: ignore disabled option when start first one
- uploadMedia: remove imageKit

---

### v0.9.5

- Remove at.
- Add Phone scalars

---

### v0.9.4

- Add FormMessage, FormError is a subclass of it.
- remove Altcha
- generatePassword use custom base62 alphabet

---

### v0.9.3

- BaseConfig: Change tokenConfig to eventConfig, add outOfScope

---

### v0.9.2

- DatatableSearch: Add formatted search data for phone
- base.service: Add SearchableFieldOptions
- service.template.hbs: update SearchableFieldOptions

---

### v0.9.1

- BaseTextConfig: Add datatableSearchByLabel
- graphql: Add support for headers
- DatatableSearch: change to rounded-md, add optiosn for preselecting single field

---

### v0.9.0

- Add: Astro components (Callout, Icon, Table) for SSR
- BaseTextConfig: add editorMaxMediasLabel;
- InputImage/image: move compress into image helper
- MediaEditor: Fix error sending duplicate mediaId, compress before upload, lower the maxSize to 5Mb
- Callout: add sub/accent style, add support for SSR, remove Transition
- Content: add DOMpurify
- Img/screen: add support for SSR
- ssr: Add ssr function

---

### v0.8.3

- Callout: remove transition group
- generateForm: use nullish colaescing operator instead of or for defaultValue
- ModalProvider: cloaseAllModal in popState
- Img/screen: add support for SSR

---

### v0.8.3

- graphql: remove VITE\_
- ButtonGroup: update mergeClass
- Formlog: fix some props not send into footer
- Select/NativeSelect: fix a bug where createControl is used twice
- Toast: add margin-top for case where the mobile screen extended tall.

---

### v0.8.2

- FIX: some typescript error

---

### v0.8.1

- graphql: simplifying backend url, fix context with assign instead of shallow merge
- qr: add type for qr

---

### v0.8.0

- graphql: Add PUBLIC_FRONTEND_HOSTNAME and initHeaders
- uploadMedia: getFileFromUrl no-cors
- DropdownSelect: Img add border
- InputDate: startOfDay/endOfDay for minDate/maxDate
- InputMedia: rewrite the component, not using mediaDatas anymore
- InputNumber: add return correct function for the input
- Dialog: update title
- Slideout: Add margin bottom for footer of mobile
- createTooltip/Tooltip: remove duplicate
- Field/FieldContext: add clearError
- generateForm: update type
- baseIconVariant: add video-paused
- Tabs: update style
- Cell: increase image width
- CellButtonDelete: fix spelling
- DatatableFormlog/GeneratedDatatable: update types for Create/Update Input
- Table: add noHeader
- Tooltip: strategy to fixed
- Add InfoList
- QRCodeImage: split to qr file
- eslint.config: add
- scalars.txt: add scalars
- screen: createScreen
- string: remove underscore
- service.plop: write service plop template
- write env.d.ts
- remove crud service

---

### v0.7.1

- Eslint: update to v9
- Date: remove dynamic import for en and vi
- update: index files

---

### v0.7.0

- Media: Media remove thumbnailUrl
- baseTextConfig: add mediaUploadInvalidFormatLabel && mediaDragLabel
- Control: ignoreField -> fieldless
- InputMedia/InputFile: children props size -> fileSize
- InputImage: add quality, maxWidth, maxHeight, maxSizeInMb, size, accept, and compressFn
- InputMedia:
  - Display file instead of uploaded image url to not hit the cdn if the user haven't submitted
  - Move loading symbol to the input image
  - Add image size
  - Add dragging image to upload
  - Remove upload by link through input
  - verifyFileAccept
  - compress images
  - checkMaxSize after compressing
  - display image while loading
- Field: add control to context
- Img: Add image size, remove thumbnail, attached optimized by size to the url

---

### v0.6.5

- InputMedia: Upload by paste
- Url: add isValidUrl
- Floating: throw error if reference not found

---

### v0.6.4

- createData: add loadDelay
- CheckboxMulti: add readOnly/disabled state for error checkbox
- Cell: update image field
- Img: remove blankAsDefault and add emptyState and errorState

---

### v0.6.3

- getFileFromURL: omit credentials
- Editor: Remove DataApi (deprecated)
- InputMedia: Only prevents not uploading more for single media
- Scrollbar: Add div props
- Base scss: use font-body
- content scss: use leading-normal

---

### v0.6.2

- Scrollbar: Add overlayscrollbar

---

### v0.6.1

- Tailwind: Update new config format, remove text-md and other custom text except text-xsm

---

### v0.6.0

- createData/Datatable: add onRefresh
- Date/Cell: change to formatDatetime
- DropdownSelect: add maxDropdownHeight
- Input number: add percentage
- Select: also search for subText
- Field/Form/FormContext: update type so name of the form object include nested properties
- FieldSet: update title style
- ButtonCreate: use main color
- Table/Datatable: Move emptyRow default to Table
- StatusBadge: Add onClick and children
- Api: check whether the url is absolute or relative
- Datatable/Field/Formlog: Move itemQuery and mutations to createDatatable, add FilterField, update types

---

### v0.5.3

- Base Icon variants: Add enabled and disabled icons

---

### v0.5.2

- Table: Add td wrap around table row
- TableRow: Add props
- Select: Add loading state

---

### v0.5.1

- DropdownSelect: Fix renderFn keep being rerendered
- AddressFields: Fix error to maximum call stack

---

### v0.5.0

- createData: return onQueryRefresh event
- Checkbox: return event for onClick
- createControl: Instead of setting value when declared, wait for hasInited first
- Datepicker: Add minDate, maxDate, fix some ui problems
- InputDate: set null if not inited, and add min/max constraint
- Cell: fix subValueAsDate not working
- CellButtonDelete: add a dialog mode
- Datatable: Add selectable and selectedItems, utilize the same function from Table
- DatatableButtonCreate: Use neutral color instead of success
- DatatableButtonRefresh: remove hard refresh
- DatatablePagination: if a custom limit is used, then put it into the limit list
- DatatableSelection: Add a counter for selection for bulk tasks
- GeneratedDatatable: Update to be able to use selectable
- GeneratedTable: Add a mutateItems options
- Table: Add selectable options
- Base SCSS: ul will use list-disc by default

---

### v0.4.6

- Date: remove setDefaultDateOptions and call it from App instead
- Add index for helpers
- Add decodeJwt
- Add AuthorizationCodePayload

---

### v0.4.5

- GraphQL Client: When init client, if the current domain is a subdomain of the assigned frontend url, then it will attach the same subdomain to the backend url.

---

### v0.4.4

- Add OauthError type
- graphQL: use OauthError type instead

---

### v0.4.3

- CellButtonUpdate: add onItemLoaded
- DatatableFormlog: Add a Spinner as a fallback
- Spinner: Always span full width

---

### v0.4.2

- Media: update create media input
- Radio: Add hasInited to Radio similar to Select

---

### v0.4.1

- Checkbox: update style
- createControl: add hasInited
- Radio: add textClass
- Select: get hasInited to fill clearable false properly
- Modal: rounded-sm xl instead
- Status Badge: update style
- Add: config scalar file to gengraph
- Option: remove JSX.Element

---

### v0.4.0

- Remove all text-... tailwind classes
- Add autocomplete for input number (default to off)
- ConfirmProvider: fix error when closing the dialog by clicking on overlay not return a result
- Formlog: hide header if there is no title
- ModalProvider: add shadow to sub modal
- change generateDatatable.tsx name to GeneratedDatatable.tsx
- Add GeneratedTable
- Add TableRow
- Table: fix the border style for closed and open, add fitContent
- StatusBadge: default to light, fix some style change
- Date: add fromDateToNow

---

### v0.3.4

- Add proper error message for failed to fetch error
- createData: fix error with loadMode more that keeps appending data when the filter changed

---

### v0.3.3

- remove primary/secondary, animation slide-in-forward/backward, rewrite fade forward
- Textarea: remove box-content and fix the height
- Add dots class for loading animation

---

### v0.3.2

- DropdownSelect: Hide overflow selected text
- Dialog: fix transitioning class for bottomsheet
- Modal: isOpen and onClose is nonullable, the content of modal still display when closing
- ModalProvider: Add Modal content style (mainly to inject max height), centering center position
- BaseRoutes: Change pathname into a signal
- Toast: Add defaultDesktopPosition
- StatusBadge: Add type solid
- Remove Must type from graphql query due to a fix in backend that returns correct nullable state
- DatatableFormlog: Fix isOpen and onClose optional

---

### v0.3.1

- Dialog: add bottomsheet mode always, change never to none, change to fromSm instead of fromMd
- Modal: add xsm and smd
- Img: Add lazyload
- createOnScreen: add manual unobserve
- service: Add context options, api return a Must type to be non-undefined

---

### v0.3.0

- change fileSize to string
- add: base text config and base icon config
- skeleton: add square and video
- add createOnScreen helper

---

### v0.2.4

- createData: add loadMode
- minor update: select, avatar
- Img: add border, default to non-border and non-click to open image
- InputMedia: fix upload from link for multi, fix style
- Number helper: Add formatCurrency
- Crud: Add PaginationCursorNode type

---

### v0.2.3

- Add mediaUploadFromLinkFailedLabel
- Add ratio and imageClass for DropdownSelect
- Img: Add contain, freeform, square and video
- FieldFooter: split hints for string array
- Modal: Remove all overflow hidden
- QRCodeImage: fix name, and remove types for it

---

### v0.2.2

- Add BaseRoutes

---

### v0.2.1

- Update services to new format

---

### v0.2.0

- Reset client when a mutation is call and succeed
- DropdownSelect changed to fixed to expand bigger, use Img instead of img
- Select: add hasAvatar, hasImage, hasColor
- InputMedia: add a viewOnly mode, fix loading & disabled state, allow multiple
- Confirm: fix the width class, add afterSubmit, use confirmAction() instead of confirm()
- Footer: add rounded-sm inherit for bottom
- Floating: based class depends on the current strategy
- Field Footer: hint accepts string array with bullet point
- Modal: temporarily remove overflow so Select can be span outside of it, will test scrollable later.
- Tab: Fix not saving when open the last tab
- Datatable: Add refreshTrigger
- Img: Add alt
- StatusBadge: Add dotHidden, when type is flat then show it, otherwise hide it by default
- Utilities: remove index
- Toast: use toast().api() instead of apiRequestWithToast

---

### v0.1.0

- Dialog: Add bottom sheet mode for mobile
- Modal: Add max width full
- Toast: center toast on mobile devices
- Add Avatar component
- Img: will render the JSX.Element in src if it's not a string
- Add device helper to check if it's mobile/tablet
- StatusBadge: add dotHiddden
- crud: add pageInfoFragment

---

### v0.0.8

- Empty: update style
- ADD QRCodeImage, require qrcode
- Add: main-container class
- Add: useScreen
- Native Select: return correct array form when using array string option
- Datatable search: trigger correctly when change the option

---

### v0.0.7

- Rewrite Spinner using baseConfig instead
- Crud service: Add maxLimit

---

### v0.0.6

- Add new content for Tailwind safelist: StatusBadge and Button (remove button class lists)
- Sort and FilterOperator no long has Enum suffix
- Input Media, fix spinner and click to upload
- Slideout has position right as default
- ModalProvider: Now SubModal will also has position, based on the main modal and accepts event for transform origin
- Tabs: Change the design, add some inkbar option
- StatusBadge: Change some design
- Util: add merge and assign
- Datatable: assign filter to nested merge them instead of override.

---

### v0.0.5

- Add Altcha for verifying user.

---

### v0.0.4

- Query and Mutation always return unnullable data
- Remove custom shadow (and shadow-xs)
- Add autoComplete field for Input and Form
- Change buttonLabel into buttonProps for InputPassword
- useForm context has a default state
- update apiRequestWithToast message
- Remove phone validation on the client side
- Remove firebase

### v0.0.3

- Floating: Fix reference not working properly
- ButtonGroup: Add loading and disable so it's not required to send in through Props
- DropdownSelect: Add Tab & Escape, disable tabIndex when it's readonly
- NativeSelect: Disable tabIndex when it's readonly
- Formlog: remove size props class
- Dialog: default to sm

---

##### v0.0.2

- Button fix a bug regarding focusable not accepting false value
- Fix DropdownSelect to always trigger open on click, and fix reset search field on blur
- Select add optionsChange and trigger to refresh the query
- Floating use onMount instead and add a constant for the delay time
- Moving the BaseIcon ref to the span wrapper
- Change the way Tabs work by registering with the Tab instead of prerender children, which could trigger unwanted UIs
- Add some method and restApi with fetch in api helper

---

##### v0.0.1

- Setup the core folder and add a README file
