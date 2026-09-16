import type { ParticipationMode } from '@/types/profile';

// Contrato que todos os dicionários de tradução (pt, en) têm de cumprir.
export interface Translations {
  common: {
    cancel: string;
    save: string;
    saving: string;
    back: string;
    continue: string;
    seeAll: string;
    tryAgain: string;
    genericError: string;
    /** Ecrã mostrado quando um ecrã rebenta a desenhar (ver ErrorScreen). */
    errorTitle: string;
    errorBody: string;
    today: string;
    yesterday: string;
    now: string;
    /** Etiqueta de perfil novo (sem histórico de sessões), usada como tempo de resposta. */
    new: string;
    user: string;
    addPhoto: string;
    starRating: (count: number) => string;
  };
  roles: {
    tutee: string;
    mentor: string;
    tutor: string;
    mentorAndTutee: string;
    /** Junta um papel de quem ensina ao de tutorando (ex.: 'Mentor e Tutorando'). */
    withTutee: (label: string) => string;
  };
  participationModes: Record<
    ParticipationMode,
    {
      /** Etiqueta curta para chips de seleção (ex.: "COMO QUERES PARTICIPAR"). */
      chip: string;
      /** Etiqueta descritiva para badges de papel só de leitura (ex.: cabeçalho do perfil). */
      role: string;
      /** Título do cartão no passo de participação da configuração inicial. */
      setupTitle: string;
      /** Subtítulo do cartão no passo de participação da configuração inicial. */
      setupSubtitle: string;
    }
  >;
  auth: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    confirmPasswordLabel: string;
    rememberLabel: string;
    forgotPassword: string;
    signIn: string;
    signingIn: string;
    noAccount: string;
    createAccount: string;
    creatingAccount: string;
    createAccountTitle: string;
    createAccountSubtitle: string;
    alreadyHaveAccount: string;
    passwordsDontMatch: string;
    passwordRequirements: string;
    institutionalEmailRequired: string;
    errorInvalidEmail: string;
    errorEmailInUse: string;
    errorWeakPassword: string;
    errorPasswordRequirements: string;
    errorWrongCredentials: string;
    errorTooManyRequests: string;
    forgotPasswordTitle: string;
    forgotPasswordSubtitle: string;
    sendResetLink: string;
    sendingResetLink: string;
    resetLinkSentTitle: string;
    resetLinkSentDescription: (email: string) => string;
    backToSignIn: string;
  };
  search: {
    title: string;
    placeholder: string;
    filtersButton: string;
    resultsCount: (count: number) => string;
    loading: string;
    empty: string;
    error: string;
    retry: string;
    recentTitle: string;
    recentClear: string;
    recentEmpty: string;
    addError: string;
  };
  filterSheet: {
    title: string;
    subjectsGroupTitle: string;
    coursePlaceholder: string;
    allCourses: string;
    clear: string;
    apply: (count: number) => string;
  };
  /** Ecrã de confirmação do email institucional (ver src/lib/auth-gate.ts). */
  emailVerification: {
    title: string;
    description: (email: string) => string;
    hint: string;
    check: string;
    checking: string;
    resend: string;
    resending: string;
    resent: string;
    notYet: string;
    signOut: string;
  };
  profileSetup: {
    createProfileTitle: string;
    createProfileSubtitleStudent: string;
    createProfileSubtitleProfessor: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    yearLabel: string;
    aboutLabel: string;
    aboutPlaceholder: string;
    learningGoalsTitle: string;
    learningGoalsSubtitle: string;
    professorSubjectsTitle: string;
    professorSubjectsSubtitle: string;
    participationTitle: string;
    participationSubtitle: string;
    eligibilityHint: string;
    teachingSubjectsTitle: string;
    teachingSubjectsHint: string;
    availabilityTitle: string;
    availabilityHint: string;
    professorAvailabilitySubtitle: string;
    skipForNow: string;
    finish: string;
    finishing: string;
  };
  home: {
    greetingMorning: string;
    greetingAfternoon: string;
    greetingEvening: string;
    notifications: string;
    sessionsTitle: string;
    sessionsOpen: string;
    materialsTitle: string;
    materialsExploreAll: string;
    attentionLabel: string;
    attentionConnections: (count: number) => string;
    attentionSessions: (count: number) => string;
    attentionMessages: (count: number) => string;
    loadError: string;
    /** Leitura das pendências (pedidos de conexão, de sessão, mensagens) que falhou. */
    attentionLoadError: string;
    firstStepsTitle: string;
    firstStepsBodyLearn: string;
    firstStepsBodyTeach: string;
    firstStepsCtaLearn: string;
    firstStepsCtaTeach: string;
  };
  navTabs: {
    home: string;
    search: string;
    matches: string;
    chat: string;
    profile: string;
  };
  evaluation: {
    close: string;
    question: (name: string) => string;
    whatWentWell: string;
    commentLabel: string;
    commentPlaceholder: (name: string) => string;
    submit: string;
    submitting: string;
    skip: string;
  };
  matches: {
    title: string;
    blockedTitle: string;
    pass: string;
    connect: string;
    connectError: string;
    loadError: string;
    emptyTitle: string;
    emptyDescription: string;
    requestSentTitle: string;
    requestSentDescription: (name?: string) => string;
  };
  chatList: {
    title: string;
    searchPlaceholder: string;
    empty: string;
    /** Leitura das conversas que falhou (regras negadas, rede). */
    loadError: string;
  };
  requestCard: {
    pending: string;
    accepted: string;
    declined: string;
    decline: string;
    accept: string;
  };
  requests: {
    /** Cabeçalho dos pedidos de conexão (a lista dos Matches, o ecrã próprio dos pedidos e o
     * cabeçalho da secção nas Notificações). */
    connectionLabel: string;
    /** Título acessível do botão de voltar no ecrã dos pedidos de conexão. */
    back: string;
    /** Ecrã dos pedidos sem nada por decidir (chegou-se lá depois de responder a todos). */
    empty: string;
    /** Falha ao aceitar/recusar um pedido. */
    respondError: string;
    /** Leitura dos pedidos pendentes que falhou (regras negadas, rede) - sem isto, a lista vazia
     * era indistinguível de "não há pedidos". */
    loadError: string;
  };
  chat: {
    notFound: string;
    /** Pré-visualização da conversa enquanto ainda não há mensagens. */
    defaultLastMessage: string;
    back: string;
    scheduleSession: string;
    material: string;
    inputPlaceholder: string;
    sendMessage: string;
    sendError: string;
    today: string;
    loadEarlierMessages: string;
    respondError: string;
  };
  attachFile: {
    title: string;
    description: string;
    fileNameLabel: string;
    fileNamePlaceholder: string;
    linkLabel: string;
    invalidLink: string;
    send: string;
    sending: string;
  };
  profileFields: {
    courseLabel: string;
    changeCourse: string;
    chooseCourse: string;
    change: string;
    choose: string;
    addSubject: string;
    add: string;
    subjectsSelectedCount: (count: number) => string;
    coursePickerTitle: string;
    coursePickerSubtitle: string;
    coursePickerSearchPlaceholder: string;
    coursePickerEmpty: string;
    subjectPickerTitle: string;
    subjectPickerSubtitle: string;
    done: string;
    periodsLabel: string;
    modalityLabel: string;
  };
  profileEdit: {
    cancel: string;
    title: string;
    save: string;
    saving: string;
    changePhoto: string;
    fullNameLabel: string;
    aboutLabel: string;
    yearLabel: string;
    participationLabel: string;
    eligibilityHint: string;
    teachesLabel: string;
    learningLabel: string;
    availabilityLabel: string;
    confirmTitle: string;
    confirmDescription: string;
  };
  otherProfile: {
    photoPlaceholder: string;
    back: string;
    chat: string;
    requestSession: string;
    connectHint: (name: string) => string;
    block: string;
    unblock: string;
    blockConfirmTitle: string;
    blockConfirmDescription: (name: string) => string;
    blockConfirm: string;
    blockError: string;
    sessionsGiven: string;
    responseTime: string;
    teaches: string;
    availabilityLabel: string;
    aboutLabel: string;
    notFound: string;
  };
  notifications: {
    title: string;
    back: string;
    sessionRequestsLabel: string;
    messagesLabel: string;
    recentLabel: string;
    suggestionsLabel: string;
    suggestionsHint: string;
    empty: string;
    respondError: string;
    requestAcceptedTitle: string;
    /** Aviso de um pedido de conexão recebido. A decisão em si acontece nos Matches. */
    connectionRequestTitle: string;
    connectionRequestAnnouncement: (name: string) => string;
    connectionRequestHint: string;
    connectionAccepted: (name: string) => string;
    sessionAccepted: (name: string, subject: string) => string;
    sessionTomorrowTitle: string;
    sessionTomorrow: (subject: string, name: string, time: string) => string;
    newMaterialTitle: string;
    materialReceived: (name: string, fileName: string) => string;
  };
  calendar: {
    weekdays: string[];
    months: string[];
    previousMonth: string;
    nextMonth: string;
  };
  sessions: {
    title: string;
    back: string;
    completeError: string;
    /** Leitura dos pedidos de sessão pendentes que falhou (regras negadas, rede). */
    loadError: string;
    sessionsCount: (count: number) => string;
    empty: string;
    completed: string;
    complete: string;
    asRole: (role: string) => string;
  };
  sessionRequest: {
    title: string;
    requestingFrom: (name: string) => string;
    subjectLabel: string;
    dateLabel: string;
    timeLabel: string;
    modalityLabel: string;
    messageLabel: string;
    messagePlaceholder: string;
    submitError: string;
    send: string;
    sending: string;
    sentTitle: string;
    sentDescription: (name: string) => string;
  };
  settings: {
    title: string;
    back: string;
    languageLabel: string;
    blockedLabel: string;
    blockedEmpty: string;
    unblock: string;
    helpLabel: string;
    helpDescription: string;
    helpAction: string;
    loadError: string;
    /** Avisos no telemóvel: o estado atual e a ação para o mudar. */
    notificationsLabel: string;
    notificationsOn: string;
    notificationsOff: string;
    notificationsUndecided: string;
    notificationsBlocked: string;
    notificationsFailed: string;
    notificationsEnable: string;
    notificationsDisable: string;
    notificationsOpenSettings: string;
    /** Apagar a conta: a secção, o aviso que a antecede e a confirmação por palavra-passe. */
    accountLabel: string;
    deleteAccount: string;
    deleteAccountDescription: string;
    deleteAccountConfirmTitle: string;
    deleteAccountConfirmDescription: string;
    deleteAccountConfirm: string;
    deleteAccountPasswordTitle: string;
    deleteAccountPasswordDescription: string;
    deleteAccountPasswordLabel: string;
    deleteAccountWorking: string;
    deleteAccountFailed: string;
  };
  myProfile: {
    /** Entrada discreta para as Definições; o ecrã não tem um separador próprio. */
    settings: string;
    professorCourse: string;
    /** Os três números do perfil, contados a partir das sessões. */
    sessionsGiven: string;
    sessionsReceived: string;
    sessionsUpcoming: string;
    subjectsLabel: string;
    aboutLabel: string;
    aboutEmpty: string;
    /** Texto do botão, junto ao nome. */
    edit: string;
    /** Descrição do mesmo botão para leitores de ecrã. */
    editProfile: string;
    signOut: string;
    /** Confirmação antes de terminar a sessão (o botão sozinho era um toque sem rede). */
    signOutConfirmTitle: string;
    signOutConfirmDescription: string;
    signOutConfirm: string;
  };
  materials: {
    title: string;
    back: string;
    filterAll: string;
    filterSent: string;
    filterReceived: string;
    sentTo: string;
    receivedFrom: string;
    empty: string;
    open: (fileName: string) => string;
    invalidLink: string;
  };
  presence: {
    online: string;
    meeting: string;
    unavailable: string;
    away: string;
  };
}
