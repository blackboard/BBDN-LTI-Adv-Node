import React, {useState, useEffect} from 'react';
import _ from 'lodash';
import {localizedComponentWrapper} from 'react-babelfish';
import {
  Stack, StackItem, Spinner, SpinnerSize
} from 'office-ui-fabric-react';
import {ISortableTableHeader, SortableTable, SortDirection} from '@bb-ui-toolkit/toolkit-react/lib/SortableTable';
import {ISortableTableRow} from "@bb-ui-toolkit/toolkit-react";
import {AssignmentInput, IUser, createDefaultAssignmentInput} from './assignment-creator/models';
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
  const [userData, setUserData] = useState<IUser[]>([]);
  const [rows, setRows] = useState<ISortableTableRow[]>([]);

  useEffect(() => {
    fetch('/assignmentData').then(response => response.json()).then(data => {
      console.log(`assignmentData returned is ${JSON.stringify(data)}`);
      if (data.id) {
        setAssignment(data);
      }
      setLoading(false);
    });

    fetch(`userData?nonce=${params.getNonce()}`).then(response => response.json()).then(data => {
      console.log(`userData returned is ${JSON.stringify(data)}`);
      setUserData(data);
      buildRows(data);
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
    // TODO send back to deep link response with no data; what about when not deep linking?
  }

  const xhrHeaders = {
    'Content-type': 'application/json'
  }

  function onSubmit() {
    console.log(`onSubmit with ${JSON.stringify(assignment)}`);

    // TODO validate name

    if (params.isDeepLinking()) {
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
        headers: xhrHeaders
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
    } else {
      const requestBody = {
        "nonce": params.getNonce(),
        "assignment": {
          id: assignment.id,
          name: assignment.name,
          submission: assignment.submission,
          startDateTime: assignment.startDateTime,
          endDateTime: assignment.endDateTime,
          grade: assignment.grade
        }
      };

      if (params.isStudent()) {
        axios.post("/saveSubmission", requestBody, {}).then(response => {
          console.log(`saveSubmission returned ${JSON.stringify(response)}`);
        });
      } else {
        axios.post("/saveAssignment", requestBody, {}).then(response => {
          console.log(`saveAssignment returned ${JSON.stringify(response)}`);
        });
      }
    }
  }

  /*
  if (loading) {
    return (
        <div className="spinnerContainer">
          <Spinner size={SpinnerSize.large}/>
        </div>
    )
  }

   */

  let submissionKey = 'ltiAdv.description';
  if (params.isStudent()) {
    submissionKey = 'ltiAdv.submission';
  }

  function buildRows(data: IUser[]){
    const rows = data.map((user: IUser) => {
      return {
        key: user.id,
        cells: [
          <span>{user.name}</span>,
          <span>{user.email}</span>,
          <span>{user.grade}</span>
        ]
      };
    });
    setRows(rows)
    setUserData(data)
  }

  function handleNameSort(sortDirection: SortDirection) {
    const dataCopy = userData;
    dataCopy.sort((showA, showB) => {
      const aName = showA.name ?? '';
      const bName = showB.name ?? ''
      return sortDirection === SortDirection.Ascending ? aName.localeCompare(bName) : bName?.localeCompare(aName);
    });
    buildRows(dataCopy)
  }

  const headers: ISortableTableHeader[] = [
    {
      key: 'name',
      name: props.localize.translate('ltiAdv.userName'),
      width: 100,
      onSort: handleNameSort
    },
    {
      key: 'email',
      name: props.localize.translate('ltiAdv.userEmail'),
      width: 200,
    },
    {
      key: 'grade',
      name: props.localize.translate('ltiAdv.userGrade'),
      width: 200,
    }
]

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
                <input type="hidden" name="assignmentId" value={assignment?.id}/>
                <TextField
                    label={props.localize.translate('ltiAdv.name')}
                    value={assignment?.name}
                    analyticsId='ltiAdv.nameField'
                    disabled={params.isStudent()}
                    onChanged={onNameChanged}
                    errorMessage={undefined}
                />
                <TextField
                    label={props.localize.translate(submissionKey)}
                    value={assignment?.submission}
                    multiline
                    rows={10}
                    analyticsId='ltiAdv.submissionField'
                    onChanged={onSubmissionChanged}
                />
                <TextField
                    className={params.isStudent() ? '' : 'hidden'}
                    label={props.localize.translate('ltiAdv.grade')}
                    value={assignment?.grade}
                    analyticsId='ltiAdv.gradeField'
                    onChanged={onGradeChanged}
                    errorMessage={undefined}
                />
              </StackItem>
            </div>
            <div className={params.isStudent() ? 'hidden' : ''}>
              <StackItem grow>
                <SortableTable
                    useGrayHeader={true}
                    headers={ headers }
                    rows={ rows }
                    tableName={ props.localize.translate('ltiAdv.tableName') }
                    analyticsId='ltiAdv.userTable'
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
