import React, {useState, useEffect} from 'react';
import _ from 'lodash';
import {
  Stack, StackItem, Spinner, SpinnerSize
} from 'office-ui-fabric-react';
import {localizedComponentWrapper} from 'react-babelfish';
import {AssignmentInput, createDefaultAssignmentInput} from './assignment-creator/models';
import {parameters} from './util/parameters';

import {BbPanelHeader, BbPanelType, BbPanelFooter} from '@bb-ui-toolkit/toolkit-react/lib/BbPanel';
import axios from 'axios';
import {TextField} from '@bb-ui-toolkit/toolkit-react/lib/TextField';
import {AssignmentPageProps} from "./util/props";

const params = parameters.getInstance();

//
// Assignment page component
//

function ViewAssignmentPageComponent(props: AssignmentPageProps) {
  const [assignment, setAssignment] = useState<AssignmentInput>(createDefaultAssignmentInput());
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/assignmentData').then(response => response.json()).then(data => {
      console.log(`assignmentData returned is ${JSON.stringify(data)}`);
      //setAssignment(data);
      setLoading(false);
    });
  }, []);

  function onNameChanged(newValue: string | undefined) {
    const nextAssignment = _.cloneDeep(assignment);
    nextAssignment.name = newValue ?? '';
    setAssignment(nextAssignment);
  }

  function onSubmissionChanged(newValue: string | undefined) {
    const nextAssignment = _.cloneDeep(assignment);
    nextAssignment.submission = newValue ?? '';
    setAssignment(nextAssignment);
  }

  function onGradeChanged(newValue: string | undefined) {
    const nextAssignment = _.cloneDeep(assignment);
    nextAssignment.grade = newValue ?? '';
    setAssignment(nextAssignment);
  }

  function onCancel() {
    alert('Cancel clicked; use the X in the upper left to close the panel');
    // TODO send back to deep link response with no data
  }

  function onSubmit() {
    console.log(`onSubmit with ${JSON.stringify(assignment)}`);

    // TODO validate name

    if (params.isStudent()) {
      // TODO Call endpoint to save the submission and send the grade back to Learn
    } else {
      // Send request to the Node server to send the stream to Learn
      const requestBody = {
        "nonce": params.getNonce(),
        "assignment": {
          name: assignment.name,
          submission: assignment.submission,
          startDateTime: assignment.startDateTime.toISOString(),
          endDateTime: assignment.endDateTime.toISOString()
        }
      };

      axios.post("/sendAssignment", requestBody, {
        headers: {
          'Content-type': 'application/json'
        }
      }).then(response => {
        // The LTI Deep Linking spec requires a form POST back to the Platform
        const form = document.createElement('form');
        form.setAttribute('action', params.getReturnUrl() as string);
        form.setAttribute('method', 'POST');
        const jwtParam = document.createElement('input');
        jwtParam.setAttribute('name', 'JWT')
        jwtParam.setAttribute('value', response.data);
        form.appendChild(jwtParam);
        document.body.appendChild(form);
        form.submit();
      });
    }
  }

  if (loading) {
    return (
        <div className="spinnerContainer">
          <Spinner size={SpinnerSize.large}/>
        </div>
    )
  }

  return (
      <div className="streamListContainer">
        <BbPanelHeader
            title={props.localize.translate('ltiAdv.assignment')}
            smallHeaderTitle={params.getCourseName()}
            type={BbPanelType.full}
            analyticsId="ltiAdv.header"/>
        <Stack
            className="container"
            verticalFill
            tokens={{
              childrenGap: 35
            }}>
          <Stack>
            <div className="textfield-container">
              <StackItem grow>
                <TextField
                    label={props.localize.translate('ltiAdv.name')}
                    value={assignment?.name}
                    analyticsId='ltiAdv.nameField'
                    disabled={params.isStudent()}
                    onChanged={onNameChanged}
                    errorMessage={undefined}
                />
                <TextField
                    label={props.localize.translate('ltiAdv.submission')}
                    value={assignment?.submission}
                    multiline
                    rows={10}
                    analyticsId='ltiAdv.submissionField'
                    onChanged={onSubmissionChanged}
                />
                <TextField
                    label={props.localize.translate('ltiAdv.grade')}
                    value={assignment?.grade}
                    analyticsId='ltiAdv.gradeField'
                    onChanged={onGradeChanged}
                    errorMessage={undefined}
                />
              </StackItem>
            </div>
          </Stack>
        </Stack>
        <BbPanelFooter
            primaryButtonProps={{
              text: props.localize.translate('ltiAdv.submit'),
              ariaLabel: props.localize.translate('ltiAdv.submit'),
              onClick: () => onSubmit()
            }}
            secondaryButtonProps={{
              text: props.localize.translate('ltiAdv.cancel'),
              ariaLabel: props.localize.translate('ltiAdv.cancel'),
              onClick: () => onCancel()
            }}
            analyticsId="ltiAdv.createStream.footer"
        />
      </div>
  );
}

export default localizedComponentWrapper(ViewAssignmentPageComponent);
