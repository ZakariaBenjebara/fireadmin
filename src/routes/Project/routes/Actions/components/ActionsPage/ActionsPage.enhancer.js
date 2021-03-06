import { get } from 'lodash'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { withStateHandlers, withHandlers, withProps } from 'recompose'
import { firestoreConnect } from 'react-redux-firebase'
import { withNotifications } from 'modules/notification'
import * as handlers from './ActionsPage.handlers'

export default compose(
  withNotifications,
  // Create listeners for Firestore
  firestoreConnect(({ params }) => [
    // Project environments
    {
      collection: 'projects',
      doc: params.projectId,
      subcollections: [{ collection: 'environments' }]
    },
    // Project
    {
      collection: 'projects',
      doc: params.projectId
    }
  ]),
  // Map redux state to props
  connect((state, { params }) => ({
    auth: state.firebase.auth,
    project: get(state.firestore, `data.projects.${params.projectId}`)
  })),
  // State handlers as props
  withStateHandlers(
    () => ({
      templateEditExpanded: true,
      actionProcessing: false,
      actionProgress: null
    }),
    {
      toggleTemplateEdit: ({ templateEditExpanded }) => () => ({
        templateEditExpanded: !templateEditExpanded
      }),
      closeTemplateEdit: () => () => ({
        templateEditExpanded: false
      }),
      selectActionTemplate: () => newSelectedTemplate => ({
        selectedTemplate: newSelectedTemplate,
        templateEditExpanded: false
      }),
      clearRunner: () => () => ({
        selectedTemplate: null,
        templateEditExpanded: true
      }),
      toggleActionProcessing: ({ actionProcessing }) => e => ({
        actionProcessing: !actionProcessing
      }),
      setActionProgress: ({ actionProcessing }) => stepStatus => ({
        actionProgress: !actionProcessing
      })
    }
  ),
  // Handlers as props
  withHandlers(handlers),
  withProps(({ selectedTemplate }) => ({
    templateName: selectedTemplate
      ? `Template: ${get(selectedTemplate, 'name', '')}`
      : 'Template'
  }))
)
